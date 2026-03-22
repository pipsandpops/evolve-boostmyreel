using AIReelBooster.API.ImageGrowthEngine.Interfaces;
using AIReelBooster.API.ImageGrowthEngine.Models;

namespace AIReelBooster.API.ImageGrowthEngine.Services;

/// <summary>
/// Deterministic scoring engine.
///
/// Score breakdown (100 pts total):
///   Visual quality   35 pts  — brightness, contrast, sharpness, clutter
///   Human presence   18 pts  — face detected, face count
///   Content signals  22 pts  — text overlay, aspect ratio, colour temperature
///   AI estimate      25 pts  — Claude's own score (scaled 0-25)
/// </summary>
public class EngagementPredictor : IEngagementPredictor
{
    public EngagementPrediction Predict(VisualFeatures visual, SemanticAnalysis semantic)
    {
        var breakdown = new Dictionary<string, int>();

        // ── 1. Visual quality (35 pts) ────────────────────────────────────────
        int brightScore = ScoreBrightness(visual.Brightness);
        int contrastPts = visual.IsHighContrast ? 10 : visual.Contrast >= 40 ? 6 : 3;
        int sharpPts    = visual.IsSharp ? 8 : visual.Sharpness >= 30 ? 4 : 1;
        int clutterPts  = visual.VisualClutterScore < 35 ? 8
                        : visual.VisualClutterScore < 60 ? 5 : 2;

        breakdown["Lighting & Brightness"]  = brightScore;
        breakdown["Colour Contrast"]        = contrastPts;
        breakdown["Image Sharpness"]        = sharpPts;
        breakdown["Visual Clarity (clutter)"] = clutterPts;

        // ── 2. Human presence (18 pts) ────────────────────────────────────────
        int facePts = semantic.HasFace
            ? (semantic.FaceCount >= 2 ? 18 : 15)   // multiple faces = social proof bonus
            : 0;

        breakdown["Human Face / Presence"]  = facePts;

        // ── 3. Content signals (22 pts) ───────────────────────────────────────
        int textPts   = semantic.HasTextOverlay ? 12 : 0;
        int aspectPts = visual.AspectRatio is "4:5" or "9:16" ? 7
                      : visual.AspectRatio is "1:1"           ? 5 : 2;
        int colorPts  = visual.ColorTemperature == "warm" ? 3 : 2; // warm tones perform slightly better

        breakdown["Text Overlay"]     = textPts;
        breakdown["Aspect Ratio"]     = aspectPts;
        breakdown["Colour Warmth"]    = colorPts;

        // ── 4. Claude semantic score (25 pts) ────────────────────────────────
        int claudePts = (int)Math.Round(semantic.ClaudePostScore / 100.0 * 25);
        breakdown["AI Quality Score"] = claudePts;

        int total = breakdown.Values.Sum();
        total = Math.Clamp(total, 0, 100);

        return new EngagementPrediction
        {
            PostScore         = total,
            LikesPrediction   = ToLevel(total, thresholds: [30, 55, 75]),
            SaveProbability   = ToLevel(semantic.HasTextOverlay ? total + 8 : total, thresholds: [30, 55, 75]),
            ShareProbability  = ToLevel(semantic.HasFace ? total + 5 : total - 5, thresholds: [40, 60, 80]),
            Confidence        = total >= 60 ? ConfidenceLevel.High
                              : total >= 40 ? ConfidenceLevel.Medium
                              : ConfidenceLevel.Low,
            EstimatedReach    = ClassifyReach(total),
            ScoreBreakdown    = breakdown,
        };
    }

    public List<string> BuildInsights(VisualFeatures visual, SemanticAnalysis semantic, int postScore)
    {
        var insights = new List<string>();

        // Always lead with the strongest growth advice
        if (!semantic.HasFace)
            insights.Add("Adding a human face can increase engagement by up to 38% — viewers connect with people, not objects.");

        if (!semantic.HasTextOverlay)
            insights.Add("Posts with bold text overlays get 2× more saves — add a headline or key stat to your image.");

        if (!visual.IsHighContrast)
            insights.Add($"Your contrast score is {visual.Contrast:F0}/100 — increase contrast so your post stands out in a busy feed.");

        if (!visual.IsWellLit)
        {
            if (visual.Brightness < 30)
                insights.Add("Image appears dark — brightening by 20-30% typically lifts engagement 15-25%.");
            else
                insights.Add("Image may be overexposed — reducing brightness slightly improves perceived quality.");
        }

        if (!visual.IsSharp)
            insights.Add($"Sharpness score is {visual.Sharpness:F0}/100 — a blurry image signals low effort and reduces saves.");

        if (visual.VisualClutterScore > 65)
            insights.Add("This image looks visually cluttered — a cleaner composition with one focal point performs 40% better.");

        if (visual.AspectRatio is not ("4:5" or "9:16" or "1:1"))
            insights.Add("Switch to 4:5 or 1:1 crop — these ratios take up more feed space and get 20% more impressions on Instagram.");

        if (semantic.FaceCount >= 1 && semantic.FaceCount < 2 && semantic.SceneType == "person")
            insights.Add("Including 2-3 people in a post adds social proof and can increase shares by up to 30%.");

        // Positive reinforcements
        if (semantic.HasFace)
            insights.Add("Human presence detected — this is one of the strongest engagement signals on social media.");
        if (semantic.HasTextOverlay)
            insights.Add("Text overlay present — this increases saves and shares, especially for educational content.");
        if (visual.IsHighContrast && visual.IsWellLit)
            insights.Add("Great visual quality — high contrast and good lighting make your content scroll-stopping.");

        // Add Claude's own boosters/killers
        foreach (var booster in semantic.EngagementBoosters.Take(2))
            insights.Add($"Strength: {booster}");
        foreach (var killer in semantic.EngagementKillers.Take(2))
            insights.Add($"Watch out: {killer} — consider addressing this before posting.");

        return insights;
    }

    public List<string> IdentifyMissingElements(VisualFeatures visual, SemanticAnalysis semantic)
    {
        var missing = new List<string>();

        if (!semantic.HasFace)
            missing.Add("Human face or person — adds emotion and relatability");

        if (!semantic.HasTextOverlay)
            missing.Add("Text overlay / headline — anchors the message for scrollers");

        if (!visual.IsHighContrast)
            missing.Add("High contrast — needed for thumb-stopping visual impact");

        if (!visual.IsWellLit)
            missing.Add("Optimal lighting — poor exposure signals low production quality");

        if (!visual.IsSharp)
            missing.Add("Image sharpness — blurry content is filtered out by audience attention");

        if (visual.AspectRatio is not ("4:5" or "9:16" or "1:1"))
            missing.Add("Platform-native aspect ratio (4:5 or 1:1) — odd crops waste feed real estate");

        if (semantic.QualityIssues.Count > 0)
            missing.AddRange(semantic.QualityIssues.Select(q => $"Quality fix needed: {q}"));

        return missing;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static int ScoreBrightness(double brightness)
    {
        // Ideal range: 35-75
        if (brightness is >= 35 and <= 75) return 9;
        if (brightness is >= 25 and <= 85) return 6;
        return 2;
    }

    private static EngagementLevel ToLevel(int score, int[] thresholds)
    {
        score = Math.Clamp(score, 0, 100);
        if (score <= thresholds[0]) return EngagementLevel.Low;
        if (score <= thresholds[1]) return EngagementLevel.Medium;
        if (score <= thresholds[2]) return EngagementLevel.High;
        return EngagementLevel.Viral;
    }

    private static string ClassifyReach(int score) => score switch
    {
        >= 80 => "100K+",
        >= 65 => "20K-100K",
        >= 45 => "5K-20K",
        _     => "1K-5K",
    };
}
