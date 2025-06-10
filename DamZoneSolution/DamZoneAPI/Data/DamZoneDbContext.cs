using Microsoft.EntityFrameworkCore;

namespace DamZoneAPI.Data
{
    public class DamZoneDbContext : DbContext
    {
        public DamZoneDbContext(DbContextOptions<DamZoneDbContext> options) : base(options) { }


    }
}
