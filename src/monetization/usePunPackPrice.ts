import { useEffect, useState } from 'react';
import { FALLBACK_PRICE, getPunPackPrice } from './purchases';

/** 好笑記憶包的價格字串：先顯示備用價格（NT$90），商店在地化價格讀到後替換。 */
export function usePunPackPrice(): string {
  const [price, setPrice] = useState(FALLBACK_PRICE);
  useEffect(() => {
    let alive = true;
    getPunPackPrice()
      .then((p) => {
        if (alive && p) setPrice(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return price;
}
