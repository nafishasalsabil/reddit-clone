PNPM?=corepack pnpm
FIREBASE?=firebase
NODE20?=source ~/.nvm/nvm.sh && nvm use 20 && firebase

.PHONY: dev test fmt deploy install stop-emulators seed seed-users export-emulators

install:
	$(PNPM) i --ignore-scripts || true
	$(PNPM) -C frontend i || true
	cd functions && $(PNPM) i || true

export-emulators:
	@echo "Exporting emulator data..."
	@mkdir -p .firebase
	@$(FIREBASE) emulators:export .firebase || echo "Export failed (emulators may not be running)"

stop-emulators:
	@echo "Stopping Firebase emulators and frontend dev server gracefully..."
	@if [ -f .firebase/emulator.pid ]; then \
		PID=$$(cat .firebase/emulator.pid 2>/dev/null || echo ""); \
		if [ -n "$$PID" ] && kill -0 $$PID 2>/dev/null; then \
			echo "Sending SIGTERM to emulator process $$PID..."; \
			kill -TERM $$PID 2>/dev/null || true; \
			sleep 5; \
			if kill -0 $$PID 2>/dev/null; then \
				echo "Process still running, force killing..."; \
				kill -9 $$PID 2>/dev/null || true; \
			fi; \
		fi; \
		rm -f .firebase/emulator.pid; \
	fi
	@-pkill -TERM -f "firebase.*emulator" 2>/dev/null; true
	@sleep 2
	@echo "Force stopping remaining processes..."
	@-pkill -f "firebase.*emulator" 2>/dev/null; true
	@-pkill -f "cloud-firestore-emulator" 2>/dev/null; true
	@-pkill -f "cloud-storage" 2>/dev/null; true
	@-pkill -f "vite" 2>/dev/null; true
	@-lsof -ti:9099,8081,9199,4000,5173 2>/dev/null | xargs -r kill -9 2>/dev/null; true
	@sleep 1
	@echo "Stopped"

dev:
	@echo "Starting frontend dev server (using production Firebase)..."
	@$(PNPM) -C frontend dev

fmt:
	$(PNPM) -C frontend prettier --write . || true
	cd functions && $(PNPM) prettier --write . || true

test:
	$(PNPM) -C frontend test
	cd functions && $(PNPM) test -- --runInBand

deploy:
	@echo "Installing firebase-tools in Node 20 environment (if needed)..."
	@bash -c 'source ~/.nvm/nvm.sh && nvm use 20 && (command -v firebase >/dev/null 2>&1 || npm install -g firebase-tools@latest)'
	@echo "Building functions..."
	@bash -c 'source ~/.nvm/nvm.sh && nvm use 20 && corepack enable && cd functions && corepack pnpm run build'
	@echo "Deploying to production Firebase (using Node 20)..."
	@bash -c 'source ~/.nvm/nvm.sh && nvm use 20 && firebase deploy --only firestore:rules,firestore:indexes'

seed:
	@echo "Seeding production Firebase database with communities and posts..."
	@echo "Make sure you're authenticated with: gcloud auth application-default login"
	@cd functions && $(PNPM) run seed

seed-users:
	@echo "Seeding dummy users for chat testing..."
	@echo "Make sure you're authenticated with: gcloud auth application-default login"
	@cd functions && $(PNPM) run seed:users
