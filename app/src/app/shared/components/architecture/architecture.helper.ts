import { architectureNarrowLayout, architectureWideLayout } from './architecture.constants';
import { IArchitectureEdge, IArchitectureLabel, IArchitectureLayout, IArchitectureNode, IArchitectureStage } from './architecture.interfaces';

export class ArchitectureHelper {
  public static wide(stages: IArchitectureStage[]): IArchitectureLayout {
    const layout = architectureWideLayout;
    const totalColumns = layout.COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);
    const columnGap = (layout.WIDTH - totalColumns) / Math.max(stages.length - 1, 1);
    const stageHeights = stages.map(
      (stage, index) => stage.items.length * layout.ITEM_HEIGHTS[index] + (stage.items.length - 1) * layout.ITEM_GAPS[index]
    );
    const contentHeight = Math.max(...stageHeights);
    const nodesByStage: IArchitectureNode[][] = [];
    const labels: IArchitectureLabel[] = [];
    let x = 0;

    stages.forEach((stage, stageIndex) => {
      const width = layout.COLUMN_WIDTHS[stageIndex];
      const height = layout.ITEM_HEIGHTS[stageIndex];
      const top = layout.TOP + (contentHeight - stageHeights[stageIndex]) / 2;

      labels.push({ x, y: layout.TITLE_Y, text: stage.title });
      nodesByStage.push(
        stage.items.map((item, itemIndex) => ({
          id: `${stage.id}-${itemIndex}`,
          x,
          y: top + itemIndex * (height + layout.ITEM_GAPS[stageIndex]),
          width,
          height,
          title: item.title,
          details: item.detail.split('|'),
          tone: stage.tone
        }))
      );
      x += width + columnGap;
    });

    const edges: IArchitectureEdge[] = [];

    for (let i = 0; i < nodesByStage.length - 1; i++) {
      edges.push(...ArchitectureHelper._bus(nodesByStage[i], nodesByStage[i + 1]));
    }

    return { width: layout.WIDTH, height: layout.TOP + contentHeight + 8, nodes: nodesByStage.flat(), edges, labels };
  }

  public static narrow(stages: IArchitectureStage[]): IArchitectureLayout {
    const layout = architectureNarrowLayout;
    const columnWidth = (layout.WIDTH - layout.COLUMN_GAP * (layout.COLUMNS - 1)) / layout.COLUMNS;
    const nodes: IArchitectureNode[] = [];
    const labels: IArchitectureLabel[] = [];
    const edges: IArchitectureEdge[] = [];
    const centerX = layout.WIDTH / 2;
    let y = 0;

    stages.forEach((stage, stageIndex) => {
      if (stageIndex > 0) {
        edges.push({ d: `M ${centerX} ${y + 4} L ${centerX} ${y + layout.STAGE_GAP - 8}`, hasArrow: true });
        y += layout.STAGE_GAP;
      }

      labels.push({ x: 0, y: y + 14, text: stage.title });
      y += layout.TITLE_HEIGHT;

      const isSingle = stage.items.length === 1;
      const height = isSingle ? layout.SINGLE_HEIGHT : layout.ITEM_HEIGHT;

      stage.items.forEach((item, itemIndex) => {
        const column = isSingle ? 0 : itemIndex % layout.COLUMNS;
        const row = isSingle ? 0 : Math.floor(itemIndex / layout.COLUMNS);

        nodes.push({
          id: `${stage.id}-${itemIndex}`,
          x: column * (columnWidth + layout.COLUMN_GAP),
          y: y + row * (height + layout.ROW_GAP),
          width: isSingle ? layout.WIDTH : columnWidth,
          height,
          title: item.title,
          details: item.detail.split('|'),
          tone: stage.tone
        });
      });

      const rows = isSingle ? 1 : Math.ceil(stage.items.length / layout.COLUMNS);
      y += rows * height + (rows - 1) * layout.ROW_GAP;
    });

    return { width: layout.WIDTH, height: y + 2, nodes, edges, labels };
  }

  private static _bus(left: IArchitectureNode[], right: IArchitectureNode[]): IArchitectureEdge[] {
    const leftEdge = Math.max(...left.map((node) => node.x + node.width));
    const rightEdge = Math.min(...right.map((node) => node.x));
    const busX = (leftEdge + rightEdge) / 2;
    const middles = [...left, ...right].map((node) => node.y + node.height / 2);
    const paths: IArchitectureEdge[] = [{ d: `M ${busX} ${Math.min(...middles)} L ${busX} ${Math.max(...middles)}`, hasArrow: false }];

    for (const node of left) {
      paths.push({ d: `M ${node.x + node.width} ${node.y + node.height / 2} L ${busX} ${node.y + node.height / 2}`, hasArrow: false });
    }

    for (const node of right) {
      paths.push({ d: `M ${busX} ${node.y + node.height / 2} L ${node.x - 8} ${node.y + node.height / 2}`, hasArrow: true });
    }

    return paths;
  }
}
