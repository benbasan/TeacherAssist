import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import confetti from 'canvas-confetti';
import RosterPanel from './RosterPanel';

// Brand-palette sectors (bg + readable text color), cycled around the wheel.
const SECTORS = [
  { bg: '#3f51b5', fg: '#ffffff' }, // indigo
  { bg: '#26a69a', fg: '#ffffff' }, // teal
  { bg: '#ffca28', fg: '#3b2f00' }, // amber
  { bg: '#ab47bc', fg: '#ffffff' }, // purple
  { bg: '#10b981', fg: '#ffffff' }, // emerald
  { bg: '#ef5350', fg: '#ffffff' }, // coral
];

const SIZE = 380; // logical canvas size (px); CSS scales it down on small screens.
const POINTER = -Math.PI / 2; // top of the wheel (12 o'clock)

function celebrate(): void {
  confetti({
    particleCount: 160,
    spread: 80,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: ['#3f51b5', '#26a69a', '#10b981', '#ffca28', '#ab47bc'],
  });
}

export default function NameWheel({ toolId: _toolId }: { toolId?: string }) {
  const [stage, setStage] = useState<'setup' | 'wheel'>('setup');
  const [allNames, setAllNames] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const activePool = useMemo(
    () => allNames.filter((n) => !removed.includes(n)),
    [allNames, removed],
  );

  // --- Canvas drawing ------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const radius = SIZE / 2 - 8;
    const pool = activePool;
    const rotation = rotationRef.current;

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (pool.length === 0) return;

    const anglePer = (2 * Math.PI) / pool.length;

    pool.forEach((name, i) => {
      const start = i * anglePer + rotation;
      const end = start + anglePer;
      const { bg, fg } = SECTORS[i % SECTORS.length];

      // Wedge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label, written from the rim inward along the sector mid-line.
      const mid = start + anglePer / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.fillStyle = fg;
      ctx.font = '700 18px Rubik, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const label = name.length > 12 ? `${name.slice(0, 11)}…` : name;
      ctx.fillText(label, radius - 16, 0);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#3f51b5';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#3f51b5';
    ctx.font = '700 22px Rubik, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯', cx, cy + 1);

    // Fixed pointer at the top, pointing down into the wheel.
    ctx.beginPath();
    ctx.moveTo(cx - 16, 2);
    ctx.lineTo(cx + 16, 2);
    ctx.lineTo(cx, 34);
    ctx.closePath();
    ctx.fillStyle = '#1a237e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [activePool]);

  // Redraw whenever the pool changes or we (re)enter the wheel screen.
  useEffect(() => {
    if (stage === 'wheel') draw();
  }, [stage, draw]);

  // Cancel any in-flight animation on unmount.
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // --- Spin mechanic -------------------------------------------------------
  const spin = useCallback(() => {
    const pool = activePool;
    if (spinning || pool.length === 0) return;

    const anglePer = (2 * Math.PI) / pool.length;
    const winnerIndex = Math.floor(Math.random() * pool.length);

    const start = rotationRef.current;
    const twoPi = 2 * Math.PI;
    // Rotation that brings the winner's center under the pointer, then add spins.
    let target = POINTER - (winnerIndex + 0.5) * anglePer;
    while (target < start) target += twoPi;
    target += 5 * twoPi; // at least 5 full turns for drama
    const delta = target - start;
    const duration = 3800;

    setDialogOpen(false);
    setWinner(null);
    setSpinning(true);
    const startTime = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      rotationRef.current = start + delta * eased;
      draw();
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setSpinning(false);
        setWinner(pool[winnerIndex]);
        setDialogOpen(true);
        celebrate();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [activePool, spinning, draw]);

  // --- Setup screen --------------------------------------------------------
  if (stage === 'setup') {
    return (
      <RosterPanel
        emoji="🎡"
        title="גלגל המזל של השמות"
        intro="טוענים את רשימת התלמידים, מסובבים את הגלגל — והגלגל בוחר נציג באקראי, בלי ויכוחים."
        cta="בנה את הגלגל 🎡"
        min={1}
        onReady={(names) => {
          setAllNames(names);
          setRemoved([]);
          rotationRef.current = 0;
          setStage('wheel');
        }}
      />
    );
  }

  // --- Wheel screen --------------------------------------------------------
  const poolEmpty = activePool.length === 0;

  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
      >
        <Chip
          label={`${activePool.length} שמות בגלגל`}
          color="primary"
          sx={{ fontWeight: 700 }}
        />
        {removed.length > 0 && (
          <Chip label={`${removed.length} הוסרו`} variant="outlined" color="secondary" />
        )}
      </Stack>

      {poolEmpty ? (
        <Stack spacing={2} sx={{ alignItems: 'center', py: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
            כל השמות הוסרו מהגלגל 🎉
          </Typography>
          <Button
            variant="contained"
            startIcon={<RestartAltRoundedIcon />}
            onClick={() => setRemoved([])}
          >
            אפס את הרשימה
          </Button>
        </Stack>
      ) : (
        <Box sx={{ width: '100%', maxWidth: SIZE }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            aria-label="גלגל השמות"
          />
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<CasinoRoundedIcon />}
        disabled={spinning || poolEmpty}
        onClick={spin}
        sx={{ fontWeight: 800, fontSize: 22, py: 1.6, px: 5, borderRadius: 16 }}
      >
        {spinning ? 'מסתובב…' : 'סובב את הגלגל! 🎡'}
      </Button>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {removed.length > 0 && (
          <Button
            variant="text"
            color="secondary"
            startIcon={<RestartAltRoundedIcon />}
            onClick={() => setRemoved([])}
            disabled={spinning}
          >
            החזר את כל השמות
          </Button>
        )}
        <Button
          variant="text"
          startIcon={<EditRoundedIcon />}
          onClick={() => setStage('setup')}
          disabled={spinning}
        >
          רשימה חדשה
        </Button>
      </Stack>

      {/* Winner banner */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { textAlign: 'center', p: 2, borderRadius: 16 } } }}
      >
        <DialogContent>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            הגלגל בחר ב…
          </Typography>
          <Typography
            variant="h2"
            color="primary.dark"
            sx={{ fontWeight: 900, lineHeight: 1.1, wordBreak: 'break-word' }}
          >
            {winner} 🎉
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<CasinoRoundedIcon />}
            onClick={spin}
            sx={{ fontWeight: 800 }}
          >
            סובב שוב
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            startIcon={<PersonRemoveRoundedIcon />}
            onClick={() => {
              if (winner) setRemoved((r) => [...r, winner]);
              setDialogOpen(false);
            }}
          >
            הסר שם זה מהסיבובים הבאים
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
