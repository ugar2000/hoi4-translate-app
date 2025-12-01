COMPOSE ?= docker compose
COMPOSE_DEV := $(COMPOSE) -f docker-compose.dev.yml

.PHONY: build up dev down

build:
	$(COMPOSE_DEV) build

up:
	$(COMPOSE) up

dev:
	$(COMPOSE_DEV) up -d

down:
	$(COMPOSE) down
