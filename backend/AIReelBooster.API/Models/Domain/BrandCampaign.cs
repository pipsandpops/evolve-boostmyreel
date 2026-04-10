namespace AIReelBooster.API.Models.Domain;

public class BrandCampaign
{
    public string   Id               { get; set; } = Guid.NewGuid().ToString();
    public string   BrandUserId      { get; set; } = string.Empty;
    public string   BrandName        { get; set; } = string.Empty;   // display name
    public string   Title            { get; set; } = string.Empty;
    public string?  Description      { get; set; }
    public string?  ThemeHashtag     { get; set; }
    public string?  ContentGuidelines { get; set; }
    public decimal  PrizeAmount      { get; set; }
    public string   PrizeCurrency    { get; set; } = "INR";
    public string?  PrizeDescription { get; set; }           // e.g. "₹10,000 + brand kit"
    public int      MaxEntries       { get; set; } = 20;
    public string   JoinCode         { get; set; } = string.Empty;   // short slug for URL
    public CampaignStatus Status     { get; set; } = CampaignStatus.Active;
    public DateTime StartsAt         { get; set; } = DateTime.UtcNow;
    public DateTime EndsAt           { get; set; }
    public string?  WinnerEntryId    { get; set; }
    public bool     PrizePaid        { get; set; } = false;
    public DateTime CreatedAt        { get; set; } = DateTime.UtcNow;
}

public class BrandCampaignEntry
{
    public string   Id             { get; set; } = Guid.NewGuid().ToString();
    public string   CampaignId     { get; set; } = string.Empty;
    public string   CreatorUserId  { get; set; } = string.Empty;    // anonymous-friendly; can be email or device id
    public string   CreatorHandle  { get; set; } = string.Empty;    // @handle shown publicly
    public string   ReelUrl        { get; set; } = string.Empty;
    public string   Platform       { get; set; } = "Instagram";     // Instagram | YouTube | TikTok
    public long     BaselineViews  { get; set; } = 0;
    public string?  PaymentHandle  { get; set; }                    // UPI / bank detail for payout
    public DateTime SubmittedAt    { get; set; } = DateTime.UtcNow;
}

public enum CampaignStatus
{
    Active  = 0,
    Ended   = 1,
    PaidOut = 2,
}
