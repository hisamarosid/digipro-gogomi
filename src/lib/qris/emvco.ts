/**
 * EMVCo QRIS Standard Parser & Dynamic Amount Injector
 * Compliant with Bank Indonesia (ASPI QRIS Standard)
 */

export const GOGO_GAMING_STATIC_QR = 
  '00020101021126610014COM.GO-JEK.WWW01189360091436609320870210G6609320870303UMI51440014ID.CO.QRIS.WWW0215ID10265487566950303UMI5204581653033605802ID5911Gogo Gaming6007BANDUNG61054013562070703A01630445B8';

export interface TLVTag {
  tag: string;
  len: number;
  val: string;
}

/**
 * Calculates 16-bit Cyclic Redundancy Check (CRC-16-CCITT) with polynomial 0x1021 and initial value 0xFFFF.
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parses raw EMVCo QR string into TLV (Tag-Length-Value) structures
 */
export function parseEMVCoTLV(qrString: string): TLVTag[] {
  const tags: TLVTag[] = [];
  let i = 0;
  while (i < qrString.length) {
    if (i + 4 > qrString.length) break;
    const tag = qrString.substring(i, i + 2);
    const len = parseInt(qrString.substring(i + 2, i + 4), 10);
    if (isNaN(len)) break;
    const val = qrString.substring(i + 4, i + 4 + len);
    tags.push({ tag, len, val });
    i = i + 4 + len;
  }
  return tags;
}

/**
 * Converts a static QRIS into a dynamic QRIS string with an embedded exact amount.
 * When scanned via banking/e-wallet apps (BCA, GoPay, ShopeePay, DANA, Livin, etc.),
 * the transaction amount will be pre-filled and locked automatically.
 */
export function convertStaticQRIStoDynamic(staticQr: string, amount: number): string {
  const tags = parseEMVCoTLV(staticQr.trim());

  // 1. Update Tag 01 (Point of Initiation Method): '11' (Static) -> '12' (Dynamic)
  const tag01 = tags.find((t) => t.tag === '01');
  if (tag01) {
    tag01.val = '12';
    tag01.len = 2;
  } else {
    tags.unshift({ tag: '01', len: 2, val: '12' });
  }

  // 2. Format Amount (Tag 54)
  const amtStr = Math.round(amount).toString();
  const existing54Idx = tags.findIndex((t) => t.tag === '54');
  if (existing54Idx !== -1) {
    tags[existing54Idx] = { tag: '54', len: amtStr.length, val: amtStr };
  } else {
    // Insert Tag 54 in standard sorted position (before Tag 58 Country Code or Tag 59 Merchant Name)
    const insertIdx = tags.findIndex((t) => parseInt(t.tag, 10) > 54);
    const newTag = { tag: '54', len: amtStr.length, val: amtStr };
    if (insertIdx !== -1) {
      tags.splice(insertIdx, 0, newTag);
    } else {
      tags.push(newTag);
    }
  }

  // 3. Remove existing CRC Tag 63 before recalculating
  const filteredTags = tags.filter((t) => t.tag !== '63');

  // 4. Build TLV concatenated string
  let output = '';
  for (const t of filteredTags) {
    const lenStr = t.val.length.toString().padStart(2, '0');
    output += `${t.tag}${lenStr}${t.val}`;
  }

  // 5. Append Tag 63 with length '04' and calculate CRC-16 checksum
  const toSign = `${output}6304`;
  const checksum = calculateCRC16(toSign);

  return `${toSign}${checksum}`;
}
