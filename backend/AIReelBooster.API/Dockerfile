# ── Build stage ────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend/AIReelBooster.API/AIReelBooster.API.csproj", "."]
RUN dotnet restore
COPY backend/AIReelBooster.API/ .
RUN dotnet publish -c Release -o /app/publish

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

# Install ffmpeg via apt
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Write startup script so $PORT expands correctly at runtime
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'export ASPNETCORE_URLS="http://+:${PORT:-8080}"' >> /app/start.sh && \
    echo 'exec dotnet AIReelBooster.API.dll' >> /app/start.sh && \
    chmod +x /app/start.sh

ENTRYPOINT ["/app/start.sh"]
