namespace AIReelBooster.API.Models.Domain;

/// <summary>Tracks who referred whom and whether the reward has been issued.</summary>
public class UserReferral
{
    public string UserId       { get; set; } = string.Empty;  // PK — the referred user
    public string ReferrerId   { get; set; } = string.Empty;  // the user who shared the link
    public bool HasUploaded    { get; set; }                  // true after referred user's 1st upload
    public bool CreditAwarded  { get; set; }                  // true after referrer's 5 credits are granted
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
}
