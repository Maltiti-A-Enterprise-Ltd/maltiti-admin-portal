import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SalesMetricsPanelComponent } from './sales-metrics-panel.component';
import { SalesApiService } from '../../services/sales-api.service';
import { EMPTY_SALES_METRICS, SalesMetrics } from '../../models/sales-metrics.model';

const metrics = (over: Partial<SalesMetrics> = {}): SalesMetrics => ({
  ...EMPTY_SALES_METRICS,
  owed: {
    amount: 21500,
    saleCount: 4,
    overdue: { amount: 19000, saleCount: 3 },
    withinTerms: { amount: 2500, saleCount: 1 },
  },
  ...over,
});

const build = (
  api: Partial<SalesApiService>,
): { component: SalesMetricsPanelComponent } => {
  TestBed.configureTestingModule({
    providers: [{ provide: SalesApiService, useValue: api }],
  });

  return {
    component: TestBed.runInInjectionContext(() => new SalesMetricsPanelComponent()),
  };
};

const serving = (value: SalesMetrics): Partial<SalesApiService> => ({
  getMetrics: () => of(value),
});

describe('SalesMetricsPanelComponent', () => {
  describe('opening and closing', () => {
    /* The ask was for this to stay out of the way until someone wants it. */
    it('starts collapsed', () => {
      expect(build(serving(metrics())).component.expanded()).toBe(false);
    });

    it('opens and closes again on toggle', () => {
      const { component } = build(serving(metrics()));

      component.toggle();
      expect(component.expanded()).toBe(true);

      component.toggle();
      expect(component.expanded()).toBe(false);
    });

    /* The collapsed row carries the headline, so the figures cannot wait for
       someone to open the panel. */
    it('has its figures before it is ever opened', () => {
      const { component } = build(serving(metrics()));

      expect(component.expanded()).toBe(false);
      expect(component.metrics().owed.amount).toBe(21500);
      expect(component.hasFigures()).toBe(true);
    });
  });

  describe('when the figures cannot be loaded', () => {
    const failing: Partial<SalesApiService> = {
      getMetrics: () => throwError(() => new Error('boom')),
    };

    /* Zeroes shown as fact would read as "nothing is owed", which is the one
       wrong answer this panel must never give. */
    it('does not present its zeroes as figures', () => {
      const { component } = build(failing);

      expect(component.failed()).toBe(true);
      expect(component.hasFigures()).toBe(false);
    });

    it('stops loading', () => {
      expect(build(failing).component.loading()).toBe(false);
    });

    it('recovers on a retry', () => {
      let attempt = 0;
      const { component } = build({
        getMetrics: () => {
          attempt += 1;
          return attempt === 1 ? throwError(() => new Error('boom')) : of(metrics());
        },
      });

      component.load();

      expect(component.failed()).toBe(false);
      expect(component.hasFigures()).toBe(true);
    });
  });

  describe('this month against last', () => {
    const forSales = (sales: number, lastMonthSales: number): SalesMetricsPanelComponent =>
      build(
        serving(metrics({ thisMonth: { sales, collected: 0 }, lastMonthSales })),
      ).component;

    const cases: [string, number, number, string, boolean][] = [
      ['a rise', 13000, 10000, '+30% vs the same point last month', false],
      ['a fall', 7000, 10000, '-30% vs the same point last month', true],
      ['no change at all', 10000, 10000, '0% vs the same point last month', false],
    ];

    cases.forEach(([label, sales, last, text, down]) => {
      it(`reports ${label}`, () => {
        const change = forSales(sales, last).monthChange();

        expect(change.text).toBe(text);
        expect(change.down).toBe(down);
      });
    });

    /* A percentage change from zero is not a number, and "+∞%" in a first
       month of trading is worse than no comparison. */
    it('says so plainly when there is nothing to compare against', () => {
      const change = forSales(13000, 0).monthChange();

      expect(change.text).toBe('no sales this time last month');
      expect(change.down).toBe(false);
    });
  });

  describe('labels', () => {
    let component: SalesMetricsPanelComponent;

    beforeEach(() => {
      component = build(serving(metrics())).component;
    });

    const overdue: [number, string][] = [
      [0, ''],
      [1, '1 day overdue'],
      [40, '40 days overdue'],
    ];

    overdue.forEach(([days, expected]) => {
      it(`renders ${days} days overdue as "${expected}"`, () => {
        expect(component.overdueLabel(days)).toBe(expected);
      });
    });

    const counts: [number, string][] = [
      [1, '1 order'],
      [4, '4 orders'],
      [0, '0 orders'],
    ];

    counts.forEach(([count, expected]) => {
      it(`renders a count of ${count} as "${expected}"`, () => {
        expect(component.saleCountLabel(count)).toBe(expected);
      });
    });
  });

  /* The name goes into the list's customer filter, which searches on person
     and organisation alike — so the label is what has to be emitted. */
  it('emits the customer name when a debtor is picked', () => {
    const { component } = build(serving(metrics()));
    const emitted: string[] = [];

    component.customerSelected.subscribe((name) => emitted.push(name));
    component.onDebtorClick({
      customerId: 'c1',
      customerName: 'Accra Naturals Ltd',
      amount: 7000,
      saleCount: 1,
      daysOverdue: 22,
    });

    expect(emitted).toEqual(['Accra Naturals Ltd']);
  });
});
