# ── Build stage ────────────────────────────────────────────────────────────────
# Build context = repo root (Railway default)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend/AIReelBooster.API/AIReelBooster.API.csproj", "."]
RUN dotnet restore
COPY backend/AIReelBooster.API/ .
RUN dotnet publish -c Release -o /app/publish

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

# Install ffmpeg via apt (avoids auto-download on Linux)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Railway injects PORT env var
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}

ENTRYPOINT ["dotnet", "AIReelBooster.API.dll"]
