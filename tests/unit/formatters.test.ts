import { describe, it, expect } from 'vitest';
import { formatIDR, generateOrderNumber, generateTicketNumber } from '../../src/lib/utils/formatters';

describe('Formatters & Order Number Generators', () => {
  it('should format numbers correctly to Indonesian Rupiah (IDR)', () => {
    expect(formatIDR(25000)).toEqual('Rp25.000');
    expect(formatIDR(149000)).toEqual('Rp149.000');
    expect(formatIDR(1250000)).toEqual('Rp1.250.000');
  });

  it('should generate cryptographically unique order numbers matching ORD-YYMMDD-XXXXXX pattern', () => {
    const orderNum1 = generateOrderNumber();
    const orderNum2 = generateOrderNumber();

    expect(orderNum1).toMatch(/^ORD-\d{6}-[A-Z0-9]{6}$/);
    expect(orderNum2).toMatch(/^ORD-\d{6}-[A-Z0-9]{6}$/);
    expect(orderNum1).not.toEqual(orderNum2);
  });

  it('should generate support ticket numbers matching TCK-YYMMDD-XXXX pattern', () => {
    const ticketNum = generateTicketNumber();
    expect(ticketNum).toMatch(/^TCK-\d{6}-[A-Z0-9]{4}$/);
  });
});
