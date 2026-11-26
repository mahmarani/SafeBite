"""Layout ordering for OCR text blocks.

Orders recognized bounding-box blocks into natural 2D reading order:
top-to-bottom across lines, and left-to-right within the same line.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple


def get_box_geometry(box: List[List[float]]) -> Tuple[float, float, float, float, float, float, float]:
    """Calculate min_x, min_y, max_x, max_y, center_x, center_y, and height of a bounding box."""
    if not box or len(box) < 4:
        return (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    xs = [float(pt[0]) for pt in box]
    ys = [float(pt[1]) for pt in box]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    height = max(1.0, max_y - min_y)
    return (min_x, min_y, max_x, max_y, center_x, center_y, height)


def order_blocks_by_layout(
    blocks: List[Dict[str, Any]],
    vertical_tolerance_ratio: float = 0.5,
) -> List[Dict[str, Any]]:
    """Sort OCR blocks into top-to-bottom, left-to-right reading order.

    Blocks on approximately the same horizontal line (where y-center difference
    is less than half the smaller block's height or bounding boxes overlap vertically)
    are clustered into the same line and sorted left-to-right.
    """
    if len(blocks) <= 1:
        return list(blocks)

    valid_blocks: List[Tuple[Dict[str, Any], Tuple[float, ...]]] = []
    invalid_blocks: List[Dict[str, Any]] = []

    for block in blocks:
        geom = get_box_geometry(block.get("box", []))
        if geom[6] > 0.0:  # height > 0
            valid_blocks.append((block, geom))
        else:
            invalid_blocks.append(block)

    if not valid_blocks:
        return list(blocks)

    # Sort primarily by min_y (top of box)
    valid_blocks.sort(key=lambda item: item[1][1])

    # Cluster into lines
    lines: List[List[Tuple[Dict[str, Any], Tuple[float, ...]]]] = []
    for item in valid_blocks:
        _, geom = item
        center_y = geom[5]
        height = geom[6]

        placed = False
        for line in lines:
            line_geoms = [l_item[1] for l_item in line]
            line_avg_center_y = sum(g[5] for g in line_geoms) / len(line_geoms)
            line_avg_height = sum(g[6] for g in line_geoms) / len(line_geoms)
            tolerance = max(line_avg_height, height) * vertical_tolerance_ratio

            if abs(center_y - line_avg_center_y) <= tolerance:
                line.append(item)
                placed = True
                break

        if not placed:
            lines.append([item])

    # Sort each line left-to-right by min_x
    ordered: List[Dict[str, Any]] = []
    for line in lines:
        line.sort(key=lambda item: item[1][0])
        ordered.extend(block for block, _ in line)

    ordered.extend(invalid_blocks)
    return ordered
