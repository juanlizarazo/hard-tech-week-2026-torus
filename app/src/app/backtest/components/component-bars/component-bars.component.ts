import { Component, Input, OnChanges } from '@angular/core';
import { CurrencyPipe, NgClass } from '@angular/common';
import { SourceChipComponent } from '@app/shared/components';
import { IBacktestLegendItem, IComponentBarGroup } from '../../backtest.interfaces';
import { IComponentBarGroupView } from './component-bars.interfaces';

@Component({
  selector: 'dt-component-bars',
  imports: [CurrencyPipe, NgClass, SourceChipComponent],
  templateUrl: './component-bars.component.html',
  styleUrl: './component-bars.component.scss'
})
export class ComponentBarsComponent implements OnChanges {
  @Input() public groups: IComponentBarGroup[] = [];
  @Input() public strategyLegend: IBacktestLegendItem[] = [];

  public views: IComponentBarGroupView[] = [];
  public zeroPercent = 0;
  public hasNegative = false;
  public showTable = false;
  public ariaSummary = '';

  public ngOnChanges(): void {
    const all = this.groups.flatMap((group) => group.bars.map((bar) => bar.savings));
    const maxPositive = Math.max(0, ...all);
    const maxNegative = Math.max(0, ...all.map((value) => -value));
    const span = maxPositive + maxNegative || 1;

    this.hasNegative = maxNegative > 0;
    this.zeroPercent = (maxNegative / span) * 100;
    this.views = this.groups.map((group) => ({
      group,
      rows: group.bars.map((bar) => {
        const lengthPercent = (Math.abs(bar.savings) / span) * 100;
        const isNegative = bar.savings < 0;

        return {
          bar,
          lengthPercent,
          isNegative,
          startPercent: isNegative ? this.zeroPercent - lengthPercent : this.zeroPercent
        };
      })
    }));
    this.ariaSummary = this.groups
      .map((group) => `${group.label}: ${group.bars.map((bar) => `${bar.strategyLabel} ${Math.round(bar.savings)} dollars`).join(', ')}`)
      .join('. ');
  }

  public toggleTable(): void {
    this.showTable = !this.showTable;
  }

  public savingsFor(group: IComponentBarGroup, strategyId: string): number | null {
    return group.bars.find((bar) => bar.strategyId === strategyId)?.savings ?? null;
  }
}
