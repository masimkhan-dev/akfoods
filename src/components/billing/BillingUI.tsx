import React from 'react';
import { Search, Plus, Minus, ShoppingCart, TrendingUp, TrendingDown, DollarSign, MessageSquarePlus, Loader2, Check, ChevronsUpDown, Users, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export const TodayOverviewBar = React.memo(({
  todayRevenue,
  todayExpenses,
  totalKhata,
  pendingSync,
  username,
  role
}: any) => (
  <div className="bg-white/80 backdrop-blur-md border-b px-6 py-2.5 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2 group">
        <div className="p-1.5 bg-accent/10 rounded-lg group-hover:scale-110 transition-transform">
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Revenue</span>
          <span className="text-sm font-bold text-accent tabular-nums">Rs. {todayRevenue.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 group">
        <div className="p-1.5 bg-destructive/10 rounded-lg group-hover:scale-110 transition-transform">
          <TrendingDown className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Expenses</span>
          <span className="text-sm font-bold text-destructive tabular-nums">Rs. {todayExpenses.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 group">
        <div className="p-1.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Net Profit</span>
          <span className={`text-sm font-bold tabular-nums ${todayRevenue - todayExpenses >= 0 ? 'text-accent' : 'text-destructive'}`}>
            Rs. {(todayRevenue - todayExpenses).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 group">
        <div className="p-1.5 bg-destructive/5 rounded-lg group-hover:scale-110 transition-transform">
          <Users className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-destructive uppercase tracking-widest leading-none">Total Khata</span>
          <span className="text-sm font-bold text-destructive tabular-nums">
            Rs. {totalKhata.toLocaleString()}
          </span>
        </div>
      </div>
      {pendingSync > 0 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full animate-pulse">
          <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-none">
            {pendingSync} Pending Sync
          </span>
        </div>
      )}
    </div>
    <div className="hidden md:block">
      <Badge variant="outline" className="text-[10px] font-bold py-1 px-3 border-border/50 bg-white/50 backdrop-blur-sm">
        TERMINAL: {username} ({role})
      </Badge>
    </div>
  </div>
));

export const MenuItemComponent = React.memo(({ item, onAdd, getIcon }: any) => (
  <div
    className="bg-white border-transparent border-2 hover:border-primary/20 rounded-xl p-2 cursor-pointer premium-hover premium-shadow flex flex-col gap-2 group active:scale-95 transition-all"
    onClick={() => onAdd(item)}
  >
    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/30">
      {item.image_url ? (
        <img src={item.image_url} alt={item.item_name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-3xl transition-all font-serif">
          {getIcon(item.category)}
        </div>
      )}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-primary text-white p-1 rounded-md shadow-lg">
          <Plus className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
    <div className="space-y-0.5">
      <p className="font-bold text-[11px] tracking-tight leading-tight line-clamp-2 min-h-[1.5rem] group-hover:text-primary transition-colors">
        {item.item_name}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-primary font-black text-[10px] tabular-nums">Rs. {Number(item.price).toLocaleString()}</span>
      </div>
    </div>
  </div>
));
