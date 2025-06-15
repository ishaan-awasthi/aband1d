FROM python:3.11-slim

WORKDIR /app

# install node
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# copy and install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy and install node deps
COPY backend/package.json ./scripts/package.json
COPY backend/package-lock.json ./scripts/package-lock.json
WORKDIR /app/scripts
RUN npm install
WORKDIR /app

# copy the rest of your app
COPY . .

EXPOSE 8080

CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
