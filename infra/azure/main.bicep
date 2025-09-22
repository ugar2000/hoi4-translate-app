@description('Prefix used for all Azure resources. Keep it short and lowercase (e.g. translator).')
param namePrefix string

@description('Azure region for the deployment (e.g. eastus, westeurope). Defaults to the resource group\'s location.')
param location string = resourceGroup().location

@description('SKU tier for the Azure Container Registry.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('Administrator login for the managed PostgreSQL Flexible Server.')
param postgresAdministratorLogin string

@description('Administrator password for the managed PostgreSQL Flexible Server.')
@secure()
param postgresAdministratorPassword string

@description('PostgreSQL version for the managed database.')
@allowed([
  '13'
  '14'
  '15'
  '16'
])
param postgresVersion string = '16'

@description('Storage size (in GB) allocated to the PostgreSQL Flexible Server.')
@minValue(32)
param postgresStorageGb int = 64

@description('Whether Geo-redundant backups are enabled for PostgreSQL.')
param postgresGeoRedundantBackups bool = false

@description('The size of the default system node pool for AKS.')
param aksNodeVmSize string = 'Standard_DS2_v2'

@description('Number of nodes in the default AKS system node pool.')
@minValue(1)
param aksNodeCount int = 2

@description('Redis cache pricing tier.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param redisSku string = 'Standard'

@description('Redis cache capacity (0-6 depending on the SKU).')
@minValue(0)
@maxValue(6)
param redisCapacity int = 1

@description('Tags applied to all created resources.')
param resourceTags object = {}

var acrName = toLower('${replace(namePrefix, '-', '')}acr')
var logAnalyticsName = '${namePrefix}-logs'
var aksName = '${namePrefix}-aks'
var postgresName = '${namePrefix}-pg'
var postgresDatabaseName = 'translator'
var redisName = '${namePrefix}-redis'
var storageAccountName = toLower(uniqueString(resourceGroup().id, namePrefix, 'storage'))
var fileShareName = 'miniodata'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: resourceTags
  properties: {
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: acrSku
  }
  tags: resourceTags
  properties: {
    adminUserEnabled: false
    zoneRedundancy: 'Disabled'
    policies: {
      retentionPolicy: {
        status: 'Disabled'
        days: 0
      }
      trustPolicy: {
        status: 'Disabled'
      }
    }
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: resourceTags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  name: '${storage.name}/default/${fileShareName}'
  properties: {
    shareQuota: 100
    enabledProtocols: 'SMB'
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: postgresName
  location: location
  tags: resourceTags
  sku: {
    name: 'Standard_D2ds_v5'
    tier: 'GeneralPurpose'
    family: 'D'
    capacity: 2
  }
  properties: {
    version: postgresVersion
    administratorLogin: postgresAdministratorLogin
    administratorLoginPassword: postgresAdministratorPassword
    storage: {
      storageSizeGB: postgresStorageGb
    }
    network: {
      delegatedSubnetResourceId: null
      privateDnsZoneArmResourceId: null
      publicNetworkAccess: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: postgresGeoRedundantBackups ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  name: '${postgres.name}/${postgresDatabaseName}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.UTF8'
  }
}

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  tags: resourceTags
  sku: {
    name: redisSku
    family: redisSku == 'Premium' ? 'P' : (redisSku == 'Standard' ? 'C' : 'C')
    capacity: redisCapacity
  }
  properties: {
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

resource aks 'Microsoft.ContainerService/managedClusters@2024-02-01' = {
  name: aksName
  location: location
  tags: resourceTags
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Base'
    tier: 'Free'
  }
  properties: {
    dnsPrefix: '${namePrefix}-aks'
    kubernetesVersion: '1.29'
    enableRBAC: true
    agentPoolProfiles: [
      {
        name: 'systempool'
        count: aksNodeCount
        vmSize: aksNodeVmSize
        osType: 'Linux'
        osSKU: 'Ubuntu'
        mode: 'System'
        type: 'VirtualMachineScaleSets'
      }
    ]
    autoScalerProfile: {}
    apiServerAccessProfile: {}
    addonProfiles: {
      monitoring: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalytics.id
        }
      }
    }
    servicePrincipalProfile: {}
  }
}

resource acrAksRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, aks.identityProfile['kubeletidentity'].objectId, 'acrpull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: aks.identityProfile['kubeletidentity'].objectId
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    aks
    acr
  ]
}

output acrLoginServer string = acr.properties.loginServer
output logAnalyticsWorkspaceId string = logAnalytics.id
output aksName string = aks.name
output aksPrincipalId string = aks.identity.principalId
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
output postgresDatabase string = postgresDatabaseName
output redisHost string = redis.properties.hostName
output redisPort int = redis.properties.sslPort
output storageAccount string = storage.name
output storageFileShare string = fileShareName
