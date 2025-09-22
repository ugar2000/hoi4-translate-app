COMPOSE ?= docker compose
COMPOSE_DEV := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: build up dev down

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up

dev:
	$(COMPOSE_DEV) up

down:
	$(COMPOSE) down
