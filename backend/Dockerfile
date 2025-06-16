# Use a minimal Python image
FROM python:3.11-slim

# Install Node.js (for .mjs)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Set working directory to backend (Render's root is already backend/)
# So no WORKDIR is needed

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend files
COPY . .

# Install Node dependencies for fetch_images.mjs
WORKDIR /scripts
COPY scripts/package.json .
RUN npm install
WORKDIR /

# Expose the port Render expects
EXPOSE 8080

# Start FastAPI
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
