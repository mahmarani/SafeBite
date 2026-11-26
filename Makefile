.PHONY: backend frontend backend-install frontend-install

backend:
	python3 -m backend.tools.run_api

frontend:
	cd frontend && npm run dev

backend-install:
	python3 -m pip install -r backend/requirements.txt

frontend-install:
	cd frontend && npm install
