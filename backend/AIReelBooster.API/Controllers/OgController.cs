using Microsoft.AspNetCore.Mvc;

namespace AIReelBooster.API.Controllers;

/// <summary>
/// Serves thin HTML pages with Open Graph meta tags for each article.
/// Social media crawlers hit these routes and get rich link previews.
/// Human visitors are instantly redirected to the SPA route (?page=...).
///
/// Routes:
///   GET /og/blog           → Founder's Story article
///   GET /og/blog-why-best  → Why BoostMyReel Wins article
/// </summary>
[ApiController]
[Route("og")]
public class OgController : ControllerBase
{
    private const string BaseUrl = "https://boostmyreel.com";

    [HttpGet("blog")]
    public ContentResult BlogFounderStory()
    {
        return OgPage(
            title:       "From Frustration to Viral Reels: How I Built BoostMyReel",
            description: "The founder story behind BoostMyReel — an AI tool for Indian content creators. Built to turn any video into a ready-to-post reel in under 30 seconds.",
            image:       $"{BaseUrl}/og-blog.jpg",
            canonical:   $"{BaseUrl}/og/blog",
            redirectTo:  $"{BaseUrl}/?page=blog"
        );
    }

    [HttpGet("blog-why-best")]
    public ContentResult BlogWhyBest()
    {
        return OgPage(
            title:       "Why BoostMyReel Wins — And Why Other Tools Fall Short",
            description: "A full competitor comparison: 15 features, 5 tool categories, and why BoostMyReel is the only all-in-one AI reel tool built for Indian creators.",
            image:       $"{BaseUrl}/og-blog-why-best.jpg",
            canonical:   $"{BaseUrl}/og/blog-why-best",
            redirectTo:  $"{BaseUrl}/?page=blog-why-best"
        );
    }

    private ContentResult OgPage(
        string title, string description, string image, string canonical, string redirectTo)
    {
        var html = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <title>{title}</title>

              <!-- Open Graph (Facebook, LinkedIn, WhatsApp) -->
              <meta property="og:type"        content="article" />
              <meta property="og:site_name"   content="BoostMyReel" />
              <meta property="og:url"         content="{canonical}" />
              <meta property="og:title"       content="{title}" />
              <meta property="og:description" content="{description}" />
              <meta property="og:image"       content="{image}" />
              <meta property="og:image:width"  content="1200" />
              <meta property="og:image:height" content="630" />

              <!-- Twitter Card -->
              <meta name="twitter:card"        content="summary_large_image" />
              <meta name="twitter:title"       content="{title}" />
              <meta name="twitter:description" content="{description}" />
              <meta name="twitter:image"       content="{image}" />

              <!-- Instant redirect for human visitors -->
              <meta http-equiv="refresh" content="0;url={redirectTo}" />
              <link rel="canonical" href="{canonical}" />
            </head>
            <body>
              <p>Redirecting… <a href="{redirectTo}">click here if not redirected</a></p>
              <script>window.location.replace("{redirectTo}");</script>
            </body>
            </html>
            """;

        return new ContentResult
        {
            Content     = html,
            ContentType = "text/html; charset=utf-8",
            StatusCode  = 200,
        };
    }
}
