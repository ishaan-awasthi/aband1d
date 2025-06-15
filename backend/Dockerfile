FROM python:3.11-slim

WORKDIR /app

# install node
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# install node deps from local package.json
COPY package.json package-lock.json ./scripts/
WORKDIR /app/scripts
RUN npm install
WORKDIR /app

# copy rest of backend
COPY . .

EXPOSE 8080

CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
