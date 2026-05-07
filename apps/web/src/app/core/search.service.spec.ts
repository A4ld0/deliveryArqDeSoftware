import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchService);
  });

  it('stores and clears the active search query', () => {
    service.setQuery('Sushi');
    expect(service.query()).toBe('Sushi');

    service.clear();
    expect(service.query()).toBe('');
  });
});
