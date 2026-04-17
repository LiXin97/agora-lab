import type { Tile, FurnitureInstance } from './types.js';
import { createGrid } from './tileMap.js';

// Room geometry constants
const WALL = 1;
const TOP_ROOM_H = 7;      // smaller top rooms
const BREAK_ROOM_H = 5;    // smaller break room
const DESK_SPACING_X = 4;  // tighter desk spacing
const DESK_SPACING_Y = 3;  // tighter desk spacing
const SUP_OFFICE_W = 7;
const GAP_BETWEEN_BUILDINGS = 3; // narrow outdoor path
const REVIEW_BUILDING_W = 10;

export interface AgentLayout {
  role: string;
  name: string;
}

export interface DeskPosition {
  name: string;
  x: number;
  y: number;
  chairX: number;
  chairY: number;
}

export interface LabLayout {
  grid: Tile[][];
  furniture: FurnitureInstance[];
  cols: number;
  rows: number;
  deskPositions: DeskPosition[];
  meetingPositions: Array<{ x: number; y: number }>;
}

function fillRect(grid: Tile[][], x: number, y: number, w: number, h: number, type: Tile) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (y + dy < grid.length && x + dx < grid[0].length) {
        grid[y + dy][x + dx] = { ...type };
      }
    }
  }
}

function addWalls(grid: Tile[][], x: number, y: number, w: number, h: number) {
  for (let dx = 0; dx < w; dx++) {
    grid[y][x + dx] = { type: 'wall', walkable: false };
    grid[y + h - 1][x + dx] = { type: 'wall', walkable: false };
  }
  for (let dy = 0; dy < h; dy++) {
    grid[y + dy][x] = { type: 'wall', walkable: false };
    grid[y + dy][x + w - 1] = { type: 'wall', walkable: false };
  }
}

function addDoor(grid: Tile[][], x: number, y: number) {
  grid[y][x] = { type: 'door', walkable: true };
}

export function createLabLayout(agents: AgentLayout[] = []): LabLayout {
  const students = agents.filter(a => a.role === 'student');
  const staff = agents.filter(a => a.role === 'research-staff');
  const reviewers = agents.filter(a => a.role === 'paper-reviewer');
  const hasSupervisor = agents.some(a => a.role === 'supervisor');

  // Calculate workspace dimensions based on agent count
  const workspaceAgents = students.length + staff.length;
  const workspaceCols = 3;
  const workspaceRows = Math.max(2, Math.ceil(workspaceAgents / workspaceCols));
  const workspaceH = Math.max(6, workspaceRows * DESK_SPACING_Y + 3);

  // Main lab building dimensions
  const meetingW = 10;
  // Lab width must fit: supervisor + meeting on top, AND 3 desk columns + margins in workspace
  const minTopW = SUP_OFFICE_W + meetingW;
  const minWsW = 6 + workspaceCols * DESK_SPACING_X + 2; // left margin + desks + right margin
  const labW = Math.max(minTopW, minWsW);
  // Meeting room expands to fill remaining space if workspace is wider
  const actualMeetingW = labW - SUP_OFFICE_W;
  const labH = TOP_ROOM_H + workspaceH + BREAK_ROOM_H;

  // Review building dimensions
  const reviewRows = Math.max(1, Math.ceil(reviewers.length / 2));
  const reviewH = Math.max(7, reviewRows * 3 + 4);

  // Overall grid: lab + gap + review building
  const hasReviewers = reviewers.length > 0;
  const cols = hasReviewers ? labW + GAP_BETWEEN_BUILDINGS + REVIEW_BUILDING_W : labW + 2;
  const rows = Math.max(labH, hasReviewers ? reviewH + 4 : 0) + 2; // +2 for outdoor border

  // Start with outdoor/grass background
  const grid = createGrid(cols, rows, 'empty');
  const furniture: FurnitureInstance[] = [];
  const deskPositions: DeskPosition[] = [];

  // === Outdoor ground (path between buildings) ===
  // Fill the gap area with a lighter ground tile to show it's a path
  if (hasReviewers) {
    fillRect(grid, labW, 0, GAP_BETWEEN_BUILDINGS, rows, { type: 'floor_tile', walkable: true });
  }

  // ============================================================
  // MAIN LAB BUILDING (left side) — outer walls first
  // ============================================================
  const labX = 0;
  const labY = 0;

  // Fill entire lab interior with floor, then add walls for the whole building
  fillRect(grid, labX + 1, labY + 1, labW - 2, labH - 2, { type: 'floor_wood', walkable: true });
  addWalls(grid, labX, labY, labW, labH);

  // === SUPERVISOR OFFICE (top-left) ===
  const supX = labX;
  const supY = labY;
  fillRect(grid, supX + 1, supY + 1, SUP_OFFICE_W - 2, TOP_ROOM_H - 2, { type: 'floor_dark_wood', walkable: true });
  // Interior walls for supervisor office (right + bottom walls inside the building)
  for (let y = supY; y < supY + TOP_ROOM_H; y++) {
    grid[y][supX + SUP_OFFICE_W - 1] = { type: 'wall', walkable: false };
  }
  for (let x = supX; x < supX + SUP_OFFICE_W; x++) {
    grid[supY + TOP_ROOM_H - 1][x] = { type: 'wall', walkable: false };
  }
  addDoor(grid, supX + SUP_OFFICE_W - 1, supY + 3);

  furniture.push({ type: 'desk', x: supX + 2, y: supY + 1, width: 2, height: 1 });
  furniture.push({ type: 'monitor', x: supX + 2, y: supY + 1, width: 1, height: 1 });
  furniture.push({ type: 'chair', x: supX + 3, y: supY + 2, width: 1, height: 1 });
  furniture.push({ type: 'bookshelf', x: supX + 1, y: supY + 4, width: 1, height: 1 });
  furniture.push({ type: 'plant', x: supX + 5, y: supY + 1, width: 1, height: 1 });
  if (hasSupervisor) {
    const sup = agents.find(a => a.role === 'supervisor')!;
    deskPositions.push({ name: sup.name, x: supX + 3, y: supY + 2, chairX: supX + 3, chairY: supY + 2 });
  }

  // === MEETING ROOM (top-right of lab) ===
  const meetX = SUP_OFFICE_W;
  const meetY = labY;
  fillRect(grid, meetX, meetY + 1, actualMeetingW - 1, TOP_ROOM_H - 2, { type: 'floor_tile', walkable: true });
  // Bottom partition wall of meeting room
  for (let x = meetX; x < labW; x++) {
    grid[meetY + TOP_ROOM_H - 1][x] = { type: 'wall', walkable: false };
  }
  addDoor(grid, meetX + Math.floor(actualMeetingW / 2), meetY + TOP_ROOM_H - 1);

  furniture.push({ type: 'round_table', x: meetX + 3, y: meetY + 2, width: 2, height: 2, interactive: 'meeting' });
  furniture.push({ type: 'projector', x: meetX + 2, y: meetY + 1, width: 3, height: 1, interactive: 'meeting' });
  const meetChairPositions = [
    { x: meetX + 2, y: meetY + 2 },
    { x: meetX + 5, y: meetY + 2 },
    { x: meetX + 2, y: meetY + 4 },
    { x: meetX + 5, y: meetY + 4 },
    { x: meetX + 3, y: meetY + 5 },
    { x: meetX + 4, y: meetY + 5 },
  ];
  for (const pos of meetChairPositions) {
    furniture.push({ type: 'chair', x: pos.x, y: pos.y, width: 1, height: 1 });
  }

  // === MAIN WORKSPACE (middle section of lab) ===
  // Floor already set by the whole-building fill. Just add partition wall at bottom.
  const wsX = labX;
  const wsY = TOP_ROOM_H;
  const wsW = labW;
  const wsH = workspaceH;
  // Bottom partition wall between workspace and break room
  for (let x = wsX + 1; x < wsX + wsW - 1; x++) {
    grid[wsY + wsH - 1][x] = { type: 'wall', walkable: false };
  }

  // Whiteboard (kanban)
  furniture.push({ type: 'whiteboard', x: wsX + 2, y: wsY + 1, width: 3, height: 1, interactive: 'kanban' });

  // Workspace desks for students + staff
  let wsAgentIdx = 0;
  const allWsAgents = [...staff, ...students];
  for (let row = 0; row < workspaceRows; row++) {
    for (let col = 0; col < workspaceCols && wsAgentIdx < allWsAgents.length; col++) {
      const dx = wsX + 6 + col * DESK_SPACING_X;
      const dy = wsY + 2 + row * DESK_SPACING_Y;
      if (dx + 2 < wsW - 1 && dy + 2 < wsY + wsH - 1) {
        furniture.push({ type: 'desk', x: dx, y: dy, width: 2, height: 1 });
        furniture.push({ type: 'monitor', x: dx, y: dy, width: 1, height: 1 });
        furniture.push({ type: 'chair', x: dx + 1, y: dy + 1, width: 1, height: 1 });
        deskPositions.push({
          name: allWsAgents[wsAgentIdx].name,
          x: dx + 1, y: dy + 1,
          chairX: dx + 1, chairY: dy + 1,
        });
      }
      wsAgentIdx++;
    }
  }

  furniture.push({ type: 'plant', x: wsX + 1, y: wsY + 1, width: 1, height: 1 });
  furniture.push({ type: 'plant', x: wsW - 2, y: wsY + 1, width: 1, height: 1 });

  // === BREAK ROOM (bottom of lab) ===
  // Override floor to carpet
  const brX = labX;
  const brY = TOP_ROOM_H + wsH;
  const brW = labW;
  const brH = BREAK_ROOM_H;
  fillRect(grid, brX + 1, brY, brW - 2, brH - 2, { type: 'floor_carpet', walkable: true });
  // Door in partition wall between workspace and break room
  addDoor(grid, brX + Math.floor(brW / 2), brY - 1);

  furniture.push({ type: 'coffee_machine', x: brX + 2, y: brY + 1, width: 1, height: 1 });
  furniture.push({ type: 'sofa', x: brX + 5, y: brY + 1, width: 2, height: 1 });
  furniture.push({ type: 'plant', x: brX + 4, y: brY + 1, width: 1, height: 1 });
  furniture.push({ type: 'plant', x: brX + 8, y: brY + 1, width: 1, height: 1 });
  // Exit door on right wall
  addDoor(grid, labW - 1, brY + 2);

  // ============================================================
  // REVIEW BUILDING (right side, separate building)
  // ============================================================
  if (hasReviewers) {
    const revX = labW + GAP_BETWEEN_BUILDINGS;
    const revY = 2; // slight offset from top for visual interest
    const revW = REVIEW_BUILDING_W;
    const revH = reviewH;

    fillRect(grid, revX + 1, revY + 1, revW - 2, revH - 2, { type: 'floor_carpet', walkable: true });
    addWalls(grid, revX, revY, revW, revH);
    // Door on left wall (facing the path)
    addDoor(grid, revX, revY + Math.floor(revH / 2));

    // "Review Office" sign area — bookshelf decoration
    furniture.push({ type: 'bookshelf', x: revX + revW - 2, y: revY + 1, width: 1, height: 2 });
    furniture.push({ type: 'plant', x: revX + 1, y: revY + revH - 3, width: 1, height: 2 });

    // Reviewer desks — 2 columns
    let revIdx = 0;
    for (let ri = 0; ri < reviewRows; ri++) {
      for (let ci = 0; ci < 2 && revIdx < reviewers.length; ci++) {
        const dx = revX + 2 + ci * 4;
        const dy = revY + 2 + ri * 3;
        furniture.push({ type: 'desk', x: dx, y: dy, width: 2, height: 1 });
        furniture.push({ type: 'monitor', x: dx, y: dy, width: 1, height: 1 });
        furniture.push({ type: 'chair', x: dx + 1, y: dy + 1, width: 1, height: 1 });
        deskPositions.push({ name: reviewers[revIdx].name, x: dx + 1, y: dy + 1, chairX: dx + 1, chairY: dy + 1 });
        revIdx++;
      }
    }
  }

  // Make the outdoor path walkable between the two buildings
  if (hasReviewers) {
    const pathY = 2 + Math.floor(reviewH / 2); // align with review building door
    // Walkable path from lab exit to review building
    for (let x = labW - 1; x <= labW + GAP_BETWEEN_BUILDINGS; x++) {
      for (let dy = -1; dy <= 1; dy++) {
        const py = pathY + dy;
        if (py >= 0 && py < rows && x >= 0 && x < cols) {
          if (grid[py][x].type === 'empty') {
            grid[py][x] = { type: 'floor_tile', walkable: true };
          }
        }
      }
    }
    // Also make the lab right wall have a door at this path level
    if (pathY >= TOP_ROOM_H && pathY < TOP_ROOM_H + workspaceH - 1) {
      addDoor(grid, labW - 1, pathY);
    }
  }

  return {
    grid,
    furniture,
    cols,
    rows,
    deskPositions,
    meetingPositions: meetChairPositions,
  };
}

// Keep backward compat — used by tests and old code
export function getDeskPositions(): {
  supervisor: { x: number; y: number };
  staff: Array<{ x: number; y: number }>;
  students: Array<{ x: number; y: number }>;
  reviewers: Array<{ x: number; y: number }>;
} {
  return {
    supervisor: { x: 3, y: 3 },
    staff: [{ x: 16, y: 12 }],
    students: [{ x: 12, y: 12 }, { x: 17, y: 12 }, { x: 22, y: 12 }],
    reviewers: [{ x: 23, y: 3 }, { x: 27, y: 3 }],
  };
}

export function getMeetingPositions(): Array<{ x: number; y: number }> {
  return [
    { x: 11, y: 3 }, { x: 14, y: 3 },
    { x: 11, y: 5 }, { x: 14, y: 5 },
    { x: 12, y: 2 }, { x: 13, y: 6 },
  ];
}
