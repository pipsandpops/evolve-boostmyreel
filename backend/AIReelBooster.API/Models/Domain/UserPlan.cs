namespace AIReelBooster.API.Models.Domain;

public class UserPlan
{
    public string UserId { get; set; } = string.Empty;
    public string Plan { get; set; } = "free";
    public bool IsPaid { get; set; }
    public string? Email { get; set; }
    public string? PaymentId { get; set; }
    public string? OrderId { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
