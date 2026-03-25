namespace AIReelBooster.API.Models.Domain;

/// <summary>Maps a short referral code to its owner userId.</summary>
public class UserReferralCode
{
    public string Code   { get; set; } = string.Empty;   // PK — 8-char alphanumeric
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
