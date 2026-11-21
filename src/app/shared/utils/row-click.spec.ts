import { clickedOnControl } from './row-click';

describe('clickedOnControl', () => {
  const clickOn = (html: string, selector: string): boolean => {
    const host = document.createElement('div');
    host.innerHTML = html;
    const target = host.querySelector(selector)!;

    return clickedOnControl({ target } as unknown as Event);
  };

  it('ignores clicks on buttons and inside them', () => {
    expect(clickOn('<button><i class="icon"></i></button>', '.icon')).toBeTrue();
  });

  it('ignores clicks in the actions cell', () => {
    // A real row: the parser drops a <td> that is not inside a table.
    const row = '<table><tr><td class="cell-actions"><span class="x"></span></td></tr></table>';
    expect(clickOn(row, '.x')).toBeTrue();
  });

  it('counts a click on plain row content', () => {
    const row = '<table><tr><td><span class="name">Ama</span></td></tr></table>';
    expect(clickOn(row, '.name')).toBeFalse();
  });
});
