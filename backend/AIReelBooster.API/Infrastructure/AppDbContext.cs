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
    public DbSet<OtpCode>          OtpCodes          => Set<OtpCode>();

    // ── Battle ────────────────────────────────────────────────────────────────
    public DbSet<BattleChallenge>       BattleChallenges      => Set<BattleChallenge>();
    public DbSet<Battle>                Battles               => Set<Battle>();
    public DbSet<BattleEntry>           BattleEntries         => Set<BattleEntry>();
    public DbSet<BattleMetricSnapshot>  BattleMetricSnapshots => Set<BattleMetricSnapshot>();
    public DbSet<BattleVote>            BattleVotes           => Set<BattleVote>();
    public DbSet<VoteBoost>             VoteBoosts            => Set<VoteBoost>();

    // ── Prize Pool ────────────────────────────────────────────────────────────
    public DbSet<PrizePool>             PrizePools            => Set<PrizePool>();
    public DbSet<PrizeDistribution>     PrizeDistributions    => Set<PrizeDistribution>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserPlan>().HasKey(u => u.UserId);
        modelBuilder.Entity<InstagramToken>().HasKey(t => t.UserId);
        modelBuilder.Entity<UserReferralCode>().HasKey(r => r.Code);
        modelBuilder.Entity<UserReferral>().HasKey(r => r.UserId);
        modelBuilder.Entity<UserCredit>().HasKey(c => c.UserId);
        modelBuilder.Entity<OtpCode>().HasKey(o => o.Id);

        // Battle keys
        modelBuilder.Entity<BattleChallenge>().HasKey(c => c.Id);
        modelBuilder.Entity<Battle>().HasKey(b => b.Id);
        modelBuilder.Entity<BattleEntry>().HasKey(e => e.Id);
        modelBuilder.Entity<BattleMetricSnapshot>().HasKey(s => s.Id);
        modelBuilder.Entity<BattleVote>().HasKey(v => v.Id);
        modelBuilder.Entity<VoteBoost>().HasKey(v => v.Id);

        // Prize pool keys
        modelBuilder.Entity<PrizePool>().HasKey(p => p.Id);
        modelBuilder.Entity<PrizeDistribution>().HasKey(d => d.Id);
    }
}
