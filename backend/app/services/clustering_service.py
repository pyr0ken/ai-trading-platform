"""
Dynamic Support & Resistance Clustering Service using DBSCAN.
Groups noisy swing pivots into significant trading decision zones.
"""

from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.cluster import DBSCAN

class ClusteringService:
    def cluster_sr_levels(
        self,
        prices: List[float],
        spot_price: float,
        atr: float,
        eps_pct: float = 0.015,
        min_samples: int = 2
    ) -> Dict[str, Any]:
        """
        Cluster swing high/low prices using DBSCAN to detect Support (below spot)
        and Resistance (above spot) zones.
        """
        if not prices:
            return {"resistanceZones": [], "supportZones": [], "activeZoneId": None}

        # Convert to numpy array and shape for sklearn
        X = np.array(prices).reshape(-1, 1)

        # DBSCAN epsilon calculated dynamically or defaulting to percentage of spot
        epsilon = spot_price * eps_pct
        if epsilon <= 0:
            epsilon = 1.0

        db = DBSCAN(eps=epsilon, min_samples=min_samples).fit(X)
        labels = db.labels_

        clusters: Dict[int, List[float]] = {}
        for idx, label in enumerate(labels):
            label_int = int(label)
            if label_int == -1:
                continue  # Outlier
            if label_int not in clusters:
                clusters[label_int] = []
            clusters[label_int].append(prices[idx])

        resistance_zones = []
        support_zones = []

        zone_counter = 1
        for label_int, cluster_prices in clusters.items():
            cluster_prices.sort()
            price_low = cluster_prices[0]
            price_high = cluster_prices[-1]
            price_mid = float(np.mean(cluster_prices))

            # Determine kind based on spot_price
            kind = "RESISTANCE" if price_mid > spot_price else "SUPPORT"

            # Calculate metrics
            touch_count = len(cluster_prices)
            distance_pct = ((price_mid - spot_price) / spot_price) * 100
            distance_in_atr = abs(price_mid - spot_price) / atr if atr > 0 else 0

            # Calculate strength based on touch count and tightness of cluster
            range_span = price_high - price_low
            spread_pct = (range_span / price_mid) * 100 if price_mid > 0 else 0
            # Higher touch count = higher strength; tighter range = higher strength
            strength_raw = (touch_count * 10) - (spread_pct * 5)
            strength = float(np.clip(strength_raw, 10, 100))

            zone = {
                "id": f"{'R' if kind == 'RESISTANCE' else 'S'}{zone_counter}",
                "kind": kind,
                "priceLow": float(price_low),
                "priceHigh": float(price_high),
                "priceMid": float(price_mid),
                "distancePct": float(distance_pct),
                "distanceInAtr": float(distance_in_atr),
                "touchCount": touch_count,
                "strength": float(strength),
            }

            if kind == "RESISTANCE":
                resistance_zones.append(zone)
            else:
                support_zones.append(zone)
            zone_counter += 1

        # Sort: resistances ascending (nearest to spot first), supports descending (nearest to spot first)
        resistance_zones.sort(key=lambda z: z["priceMid"])
        support_zones.sort(key=lambda z: z["priceMid"], reverse=True)

        # Check if currently inside any zone
        active_zone_id = None
        for r_zone in resistance_zones:
            if r_zone["priceLow"] <= spot_price <= r_zone["priceHigh"]:
                active_zone_id = r_zone["id"]
                break
        if not active_zone_id:
            for s_zone in support_zones:
                if s_zone["priceLow"] <= spot_price <= s_zone["priceHigh"]:
                    active_zone_id = s_zone["id"]
                    break

        return {
            "resistanceZones": resistance_zones,
            "supportZones": support_zones,
            "activeZoneId": active_zone_id,
        }

clustering_service = ClusteringService()
