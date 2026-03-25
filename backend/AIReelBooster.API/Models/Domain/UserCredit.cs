namespace AIReelBooster.API.Models.Domain;

/// <summary>Boost Credits balance for a user.</summary>
public class UserCredit
{
    public string UserId    { get; set; } = string.Empty;  // PK
    public int Balance      { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
