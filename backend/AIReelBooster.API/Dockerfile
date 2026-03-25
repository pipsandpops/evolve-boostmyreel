# ── Build stage ────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend/AIReelBooster.API/AIReelBooster.API.csproj", "."]
RUN dotnet restore
COPY backend/AIReelBooster.API/ .
RUN dotnet publish -c Release -o /app/publish

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

# Install ffmpeg using a static binary (avoids apt-get network failures)
RUN apt-get update && apt-get install -y --no-install-recommends xz-utils curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
       | tar xJ --strip-components=1 -C /usr/local/bin/ --wildcards '*/ffmpeg' '*/ffprobe' \
    && chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

WORKDIR /app
COPY --from=build /app/publish .

# Write startup script so $PORT expands correctly at runtime
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'export ASPNETCORE_URLS="http://+:${PORT:-8080}"' >> /app/start.sh && \
    echo 'exec dotnet AIReelBooster.API.dll' >> /app/start.sh && \
    chmod +x /app/start.sh

ENTRYPOINT ["/app/start.sh"]
