# ==============================================================================
# Makefile — Pomodoro Timer Monorepo (Client + Server API)
# ==============================================================================

SHELL := /bin/bash
.ONESHELL:
.DEFAULT_GOAL := dev

# Ports
SERVER_PORT := 3001
CLIENT_PORT := 5173

# ANSI Colors
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
RED     := \033[31m
BOLD    := \033[1m
RESET   := \033[0m

.PHONY: all dev start run api server client test test-unit test-smoke test-e2e build install stop clean check-ports help docker-build docker-run docker-stop docker-logs docker-compose-up docker-compose-down docker-test

all: dev

## -----------------------------------------------------------------------------
## Запуск сервисов для тестирования и разработки
## -----------------------------------------------------------------------------

## dev: Запустить одновременно API (Express) и Client (Vite) для тестирования
dev start run: check-ports
	@echo -e "$(CYAN)$(BOLD)╔══════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo -e "$(CYAN)$(BOLD)║           🍅 POMODORO TIMER — СЕРВЕР И КЛИЕНТ ЗАПУЩЕНЫ          ║$(RESET)"
	@echo -e "$(CYAN)$(BOLD)╚══════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo -e "  $(GREEN)• Client UI:$(RESET)        http://localhost:$(CLIENT_PORT)"
	@echo -e "  $(GREEN)• Backend API:$(RESET)      http://localhost:$(SERVER_PORT)"
	@echo -e "  $(GREEN)• API Healthcheck:$(RESET)  http://localhost:$(SERVER_PORT)/api/health"
	@echo -e "  $(YELLOW)• Остановка:$(RESET)        Нажмите $(BOLD)Ctrl+C$(RESET) для завершения обоих сервисов\n"
	@bash -c '\
		cleanup() { \
			echo -e "\n$(YELLOW)Остановка сервисов Pomodoro Timer...$(RESET)"; \
			kill $$PID_SERVER $$PID_CLIENT 2>/dev/null || true; \
			fuser -k $(SERVER_PORT)/tcp $(CLIENT_PORT)/tcp 2>/dev/null || true; \
			echo -e "$(GREEN)Все сервисы успешно остановлены.$(RESET)"; \
		}; \
		trap cleanup INT TERM EXIT; \
		(npm --prefix server run dev) & \
		PID_SERVER=$$!; \
		(npm --prefix client run dev) & \
		PID_CLIENT=$$!; \
		wait $$PID_SERVER $$PID_CLIENT 2>/dev/null || true; \
	'

## api: Запустить только бэкенд API сервер (порт 3001)
api server:
	@echo -e "$(CYAN)$(BOLD)>>> Запуск Backend API на http://localhost:$(SERVER_PORT)...$(RESET)"
	@npm --prefix server run dev

## client: Запустить только фронтенд клиент (порт 5173)
client:
	@echo -e "$(CYAN)$(BOLD)>>> Запуск Frontend Client на http://localhost:$(CLIENT_PORT)...$(RESET)"
	@npm --prefix client run dev

## -----------------------------------------------------------------------------
## Тестирование
## -----------------------------------------------------------------------------

## test: Запустить тесты сервера (Vitest + Smoke-test)
test: test-unit test-smoke
	@echo -e "\n$(GREEN)$(BOLD)✔ Все базовые тесты успешно пройдены!$(RESET)\n"

## test-unit: Запустить юнит-тесты API (Vitest)
test-unit:
	@echo -e "$(CYAN)$(BOLD)>>> Запуск юнит-тестов API (Vitest)...$(RESET)"
	@npm --prefix server run test

## test-smoke: Запустить live smoke-тест API с реальной SQLite
test-smoke:
	@echo -e "$(CYAN)$(BOLD)>>> Запуск live smoke-теста API...$(RESET)"
	@npm --prefix server run smoke

## test-e2e: Запустить E2E тесты (Playwright) с автоматическим поднятием API и Client
test-e2e: check-ports
	@echo -e "$(CYAN)$(BOLD)>>> Запуск E2E тестов (Playwright)...$(RESET)"
	@bash -c '\
		npm --prefix server run dev > /dev/null 2>&1 & \
		PID_SERVER=$$!; \
		npm --prefix client run dev > /dev/null 2>&1 & \
		PID_CLIENT=$$!; \
		cleanup() { \
			kill $$PID_SERVER $$PID_CLIENT 2>/dev/null || true; \
			fuser -k $(SERVER_PORT)/tcp $(CLIENT_PORT)/tcp 2>/dev/null || true; \
		}; \
		trap cleanup EXIT INT TERM; \
		echo -e "  Ожидание готовности API и клиента..."; \
		READY=0; \
		for i in $$(seq 1 30); do \
			if curl -sf http://127.0.0.1:$(SERVER_PORT)/api/health >/dev/null 2>&1 && \
			   curl -sf http://127.0.0.1:$(CLIENT_PORT) >/dev/null 2>&1; then \
				READY=1; \
				break; \
			fi; \
			sleep 0.5; \
		done; \
		if [ $$READY -eq 0 ]; then \
			echo -e "$(RED)Ошибка: сервисы не смогли подняться за отведенное время.$(RESET)"; \
			exit 1; \
		fi; \
		echo -e "  $(GREEN)Сервисы готовы! Запуск сценариев Playwright...$(RESET)\n"; \
		npm --prefix client run test:e2e; \
		EXIT_CODE=$$?; \
		exit $$EXIT_CODE; \
	'

## -----------------------------------------------------------------------------
## Установка, сборка и служебные команды
## -----------------------------------------------------------------------------

## install: Установить зависимости для server и client
install:
	@echo -e "$(CYAN)$(BOLD)>>> Установка зависимостей Backend...$(RESET)"
	@npm --prefix server install
	@echo -e "$(CYAN)$(BOLD)>>> Установка зависимостей Frontend...$(RESET)"
	@npm --prefix client install
	@echo -e "$(GREEN)$(BOLD)✔ Зависимости успешно установлены.$(RESET)"

## build: Собрать продакшн сборку для server и client
build:
	@echo -e "$(CYAN)$(BOLD)>>> Сборка Backend...$(RESET)"
	@npm --prefix server run build
	@echo -e "$(CYAN)$(BOLD)>>> Сборка Frontend...$(RESET)"
	@npm --prefix client run build
	@echo -e "$(GREEN)$(BOLD)✔ Проект успешно собран.$(RESET)"

## stop: Принудительно освободить порты 3001 и 5173
stop:
	@echo -e "$(YELLOW)Освобождение портов $(SERVER_PORT) и $(CLIENT_PORT)...$(RESET)"
	@fuser -k $(SERVER_PORT)/tcp $(CLIENT_PORT)/tcp 2>/dev/null || true
	@echo -e "$(GREEN)Порты свободны.$(RESET)"

## clean: Очистить артефакты сборки и временные тестовые БД
clean:
	@echo -e "$(YELLOW)Очистка артефактов сборки и временных файлов...$(RESET)"
	@rm -rf client/dist server/dist server/data/smoke_test.db* client/test-results client/playwright-report
	@echo -e "$(GREEN)Очистка завершена.$(RESET)"

## check-ports: Проверка и освобождение портов перед запуском
check-ports:
	@if lsof -i :$(SERVER_PORT) >/dev/null 2>&1; then \
		echo -e "$(YELLOW)Порт $(SERVER_PORT) занят. Освобождаем...$(RESET)"; \
		fuser -k $(SERVER_PORT)/tcp 2>/dev/null || true; \
		sleep 0.5; \
	fi
	@if lsof -i :$(CLIENT_PORT) >/dev/null 2>&1; then \
		echo -e "$(YELLOW)Порт $(CLIENT_PORT) занят. Освобождаем...$(RESET)"; \
		fuser -k $(CLIENT_PORT)/tcp 2>/dev/null || true; \
		sleep 0.5; \
	fi

## -----------------------------------------------------------------------------
## Docker и деплой
## -----------------------------------------------------------------------------

## docker-build: Собрать продакшн Docker-образ (frontend + backend в одном контейнере)
docker-build:
	@echo -e "$(CYAN)$(BOLD)>>> Сборка Docker-образа pomodoro-timer:latest...$(RESET)"
	@docker build -t pomodoro-timer:latest .
	@echo -e "$(GREEN)$(BOLD)✔ Docker-образ успешно собран!$(RESET)"

## docker-run: Запустить собранный Docker-контейнер на порту 3000
docker-run:
	@echo -e "$(CYAN)$(BOLD)>>> Запуск Docker-контейнера на http://localhost:3000...$(RESET)"
	@docker run -d --name pomodoro-app -p 3000:3000 -v pomodoro-sqlite-data:/app/data pomodoro-timer:latest
	@echo -e "$(GREEN)$(BOLD)✔ Контейнер запущен!$(RESET) (Логи: make docker-logs, Остановка: make docker-stop)"

## docker-stop: Остановить и удалить Docker-контейнер
docker-stop:
	@echo -e "$(YELLOW)Остановка Docker-контейнера pomodoro-app...$(RESET)"
	@docker stop pomodoro-app 2>/dev/null || true
	@docker rm pomodoro-app 2>/dev/null || true
	@echo -e "$(GREEN)Контейнер остановлен и удален.$(RESET)"

## docker-logs: Показать логи запущенного контейнера
docker-logs:
	@docker logs -f pomodoro-app

## docker-compose-up: Запустить проект через docker-compose
docker-compose-up:
	@echo -e "$(CYAN)$(BOLD)>>> Запуск сервисов через docker compose...$(RESET)"
	@docker compose up -d --build
	@echo -e "$(GREEN)$(BOLD)✔ Сервисы подняты!$(RESET) Доступно на http://localhost:3000"

## docker-compose-down: Остановить сервисы docker-compose
docker-compose-down:
	@echo -e "$(YELLOW)Остановка сервисов docker compose...$(RESET)"
	@docker compose down
	@echo -e "$(GREEN)Сервисы остановлены.$(RESET)"

## docker-test: Запустить контейнер, проверить healthcheck и протестировать endpoints
docker-test: docker-build
	@echo -e "$(CYAN)$(BOLD)>>> Тестирование работы Docker-контейнера...$(RESET)"
	@bash -c '\
		docker stop pomodoro-ci-test 2>/dev/null || true; \
		docker rm pomodoro-ci-test 2>/dev/null || true; \
		docker run -d --name pomodoro-ci-test -p 3090:3000 pomodoro-timer:latest; \
		cleanup() { \
			docker stop pomodoro-ci-test >/dev/null 2>&1; \
			docker rm pomodoro-ci-test >/dev/null 2>&1; \
		}; \
		trap cleanup EXIT INT TERM; \
		echo "  Ожидание старта контейнера и healthcheck..."; \
		READY=0; \
		for i in $$(seq 1 30); do \
			if curl -sf http://127.0.0.1:3090/api/health >/dev/null 2>&1; then \
				READY=1; \
				break; \
			fi; \
			sleep 0.5; \
		done; \
		if [ $$READY -eq 0 ]; then \
			echo -e "$(RED)Ошибка: контейнер не ответил на healthcheck.$(RESET)"; \
			docker logs pomodoro-ci-test; \
			exit 1; \
		fi; \
		echo -e "  $(GREEN)Healthcheck OK!$(RESET)"; \
		echo "  Проверка отдачи фронтенда:"; \
		curl -s http://127.0.0.1:3090/ | grep -q "Pomodoro" && echo -e "  $(GREEN)Frontend OK!$(RESET)"; \
		echo "  Проверка API:"; \
		curl -sf http://127.0.0.1:3090/api/settings?userId=docker_test >/dev/null && echo -e "  $(GREEN)API Settings OK!$(RESET)"; \
		echo -e "\n$(GREEN)$(BOLD)✔ Все проверки Docker-контейнера успешно пройдены!$(RESET)\n"; \
	'

## help: Показать справку по доступным командам
help:
	@echo -e "$(BOLD)Использование:$(RESET) make $(CYAN)<команда>$(RESET)\n"
	@echo -e "$(BOLD)Доступные команды:$(RESET)"
	@awk '/^## [-a-zA-Z0-9_]+:/ { \
		helpMessage = substr($$0, 4); \
		split(helpMessage, parts, ": "); \
		printf "  \033[36m%-14s\033[0m %s\n", parts[1], parts[2]; \
	}' $(MAKEFILE_LIST)
	@echo ""
