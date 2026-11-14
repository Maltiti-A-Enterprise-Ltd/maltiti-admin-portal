import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StatementApiService } from './statement-api.service';
import { Statement } from '../models/statement.model';

describe('StatementApiService', () => {
  let api: StatementApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StatementApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for only the customers who owe when told to', () => {
    api.get({ owingOnly: true, from: '2026-07-01' }).subscribe();

    const request = http.expectOne((r) => r.url.endsWith('/statements'));
    expect(request.request.params.get('owingOnly')).toBe('true');
    expect(request.request.params.get('from')).toBe('2026-07-01');
    expect(request.request.params.has('customerId')).toBeFalse();
    request.flush({ message: 'ok', data: {} });
  });

  it('sends no owing filter when not asked', () => {
    api.get({}).subscribe();

    const request = http.expectOne((r) => r.url.endsWith('/statements'));
    expect(request.request.params.has('owingOnly')).toBeFalse();
    request.flush({ message: 'ok', data: {} });
  });

  // The API wraps the statement in `data`, like every other endpoint.
  it('hands back the statement inside the response', () => {
    const statement = { customerName: 'Customers who owe' } as Statement;
    let received: Statement | undefined;

    api.get({}).subscribe((value) => (received = value));
    http.expectOne((r) => r.url.endsWith('/statements')).flush({ message: 'ok', data: statement });

    expect(received).toEqual(statement);
  });
});
