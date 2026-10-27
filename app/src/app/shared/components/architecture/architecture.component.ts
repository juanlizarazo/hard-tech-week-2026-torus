import { Component } from '@angular/core';
import { architectureStages } from './architecture.constants';
import { ArchitectureHelper } from './architecture.helper';
import { IArchitectureView } from './architecture.interfaces';

@Component({
  selector: 'dt-architecture',
  templateUrl: './architecture.component.html',
  styleUrl: './architecture.component.scss'
})
export class ArchitectureComponent {
  private static _instanceCount = 0;

  public readonly idPrefix = `dt-architecture-${ArchitectureComponent._instanceCount++}`;
  public readonly stages = architectureStages;
  public readonly views: IArchitectureView[] = [
    { id: 'wide', layout: ArchitectureHelper.wide(architectureStages) },
    { id: 'narrow', layout: ArchitectureHelper.narrow(architectureStages) }
  ];
  public readonly summary =
    'Pipeline: free public data from EIA-930, CAISO OASIS, Open-Meteo, Rocky Mountain Power tariffs and EIA-860 flows into the refreshSnapshot Cloud Function every day at 3 p.m. Mountain, which validates and publishes a Firestore snapshot. Your browser reads that snapshot and runs the tariff engine, marginal CO2 regression, ridge forecast, site generator, LP with HiGHS and the July replay, which feed the four screens.';
}
