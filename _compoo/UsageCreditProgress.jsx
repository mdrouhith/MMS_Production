import React, { useState, useEffect } from 'react';
import { Clock, Zap, TrendingDown, AlertCircle, Crown } from 'lucide-react';

function UsageCreditProgress({ remaining = 0, total = 5, planName = "Free Tier", resetAt = null }) {
  
  const [timeLeft, setTimeLeft] = useState(null);
  const percentage = total > 0 ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0;
  
  const isLow = percentage < 20; 
  const isMedium = percentage >= 20 && percentage < 50; 
  
  let statusColor = "bg-emerald-500";
  let textColor = "text-emerald-600 dark:text-emerald-400";
  let borderColor = "border-emerald-500/20";
  let barGradient = "from-emerald-400 to-green-600";
  let gradientBg = "from-emerald-500/10 via-emerald-500/5";

  if (isMedium) {
    statusColor = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
    borderColor = "border-amber-500/20";
    barGradient = "from-amber-400 to-orange-500";
    gradientBg = "from-amber-500/10 via-amber-500/5";
  }
  if (isLow) {
    statusColor = "bg-red-500";
    textColor = "text-red-600 dark:text-red-400";
    borderColor = "border-red-500/20";
    barGradient = "from-red-500 to-rose-600";
    gradientBg = "from-red-500/10 via-red-500/5";
  }

  // Timer logic for free users
  useEffect(() => {
    if (resetAt) {
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = resetAt - now;
        if (diff <= 0) { setTimeLeft(null); clearInterval(interval); } 
        else {
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resetAt]);

  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className='w-full'>
      <div className={`relative overflow-hidden p-5 rounded-2xl border shadow-sm backdrop-blur-xl transition-all duration-500 bg-gradient-to-br ${gradientBg} to-background ${borderColor}`}>
        
        <div className='flex items-center justify-between mb-6'>
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ring-1 ring-inset ring-black/5 dark:ring-white/10 ${isLow ? "bg-red-100 dark:bg-red-900/20" : "bg-primary/10"}`}>
                {planName.toLowerCase().includes("free") ? <Zap className={`w-5 h-5 ${textColor}`} /> : <Crown className={`w-5 h-5 ${textColor}`} />}
             </div>
             <div>
                <h2 className='font-bold text-sm text-foreground tracking-tight capitalize'>{planName}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLow ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}></span>
                    <span className="text-[11px] text-muted-foreground font-medium">{isLow ? "Low Balance" : "Active"}</span>
                </div>
             </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border ${borderColor} bg-background/60 backdrop-blur-md`}>
             <span className={`text-[10px] font-bold uppercase tracking-wider ${textColor}`}>{percentage < 100 ? "Credits" : "Full"}</span>
          </div>
        </div>

        <div className='flex items-end justify-between mb-3'>
          <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                 Available Credits {isLow && <AlertCircle className="w-3 h-3 text-red-500" />}
              </span>
              <div className="flex items-baseline gap-1">
                 <span className={`text-4xl font-black tracking-tighter tabular-nums ${textColor}`}>{formatNumber(remaining)}</span>
                 <span className='text-sm text-muted-foreground/60 font-medium mb-1'>/ {formatNumber(total)}</span>
              </div>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold ${textColor}`}>{percentage.toFixed(0)}%</span>
            <p className="text-[10px] text-muted-foreground">Remaining</p>
          </div>
        </div>

        <div className="relative h-2.5 w-full bg-secondary/50 rounded-full overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
            <div className={`absolute top-0 left-0 h-full w-full opacity-20 bg-${statusColor.split('-')[1]}-200`} />
            <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm bg-gradient-to-r ${barGradient}`} style={{ width: `${percentage}%` }} />
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs">
            {timeLeft ? (
                <div className='flex items-center gap-2 text-muted-foreground font-medium bg-secondary/50 px-2 py-1 rounded-md'>
                    <Clock className="w-3.5 h-3.5" /> <span>Refill: <span className="font-mono text-foreground font-bold">{timeLeft}</span></span>
                </div>
            ) : (<div className='flex items-center gap-1.5 text-muted-foreground/70'><TrendingDown className="w-3.5 h-3.5" /><span className="text-[10px]">Usage depends on Model</span></div>)}
        </div>
      </div>
    </div>
  );
}

export default UsageCreditProgress;