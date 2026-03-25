using Microsoft.EntityFrameworkCore;
using AIReelBooster.API.Models.Domain;

namespace AIReelBooster.API.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<UserPlan>         UserPlans         => Set<UserPlan>();
    public DbSet<InstagramToken>   InstagramTokens   => Set<InstagramToken>();
    public DbSet<UserReferralCode> UserReferralCodes => Set<UserReferralCode>();
    public DbSet<UserReferral>     UserReferrals     => Set<UserReferral>();
    public DbSet<UserCredit>       UserCredits       => Set<UserCredit>();
    public DbSet<SiteStat>         SiteStats         => Set<SiteStat>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserPlan>().HasKey(u => u.UserId);
        modelBuilder.Entity<InstagramToken>().HasKey(t => t.UserId);
        modelBuilder.Entity<UserReferralCode>().HasKey(r => r.Code);
        modelBuilder.Entity<UserReferral>().HasKey(r => r.UserId);
        modelBuilder.Entity<UserCredit>().HasKey(c => c.UserId);
        modelBuilder.Entity<SiteStat>().HasKey(s => s.Key);
    }
}
