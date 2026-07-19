// Print & Play — a lean dialog for PREBUILT PrintableDoc[] (see ARCHITECTURE.md
// §13/§10). Unlike PrintPreviewDialog it has no `EducationalGame` coupling: the
// caller passes ready docs (e.g. the Ulpan worksheet + exit ticket). Reuses the
// same mechanism: render each doc on-screen for preview AND portal an identical
// copy into <div id="print-mount">, which the @media print rules in index.css
// reveal as the only printed element. The dialog stays open during print.

import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import type { PrintableDoc } from '../types/print.types';
import PrintTemplate from './PrintTemplate';

interface PrintDocDialogProps {
  docs: PrintableDoc[];
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

/** Force a page break between successive docs (the last one needs none). */
function docBreakSx(isLast: boolean) {
  return isLast ? undefined : { breakAfter: 'page', pageBreakAfter: 'always' };
}

export default function PrintDocDialog({
  docs,
  open,
  onClose,
  title = '🖨️ הדפסת חומרי הלימוד',
  subtitle,
}: PrintDocDialogProps) {
  // The body-level mount the @media print rules reveal; exists only while open.
  const [mountEl] = useState(() => {
    const el = document.createElement('div');
    el.id = 'print-mount';
    el.dir = 'rtl';
    return el;
  });
  useEffect(() => {
    if (!open) return undefined;
    document.body.appendChild(mountEl);
    return () => {
      document.body.removeChild(mountEl);
    };
  }, [open, mountEl]);

  if (docs.length === 0) return null;

  const body = docs.map((doc, i) => (
    <Box key={i} sx={docBreakSx(i === docs.length - 1)}>
      <PrintTemplate doc={doc} />
    </Box>
  ));

  return (
    // zIndex above modal+1 so it stays on top of the full-screen LessonPlayer
    // overlay (which sits at modal+1) when the print action is fired from a slide.
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="div" variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle ?? 'שחור-לבן, חסכוני בדיו, מוכן להדפסה על A4. דף העבודה כולל דף תשובות למורה.'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#eceff1' }}>
        {docs.map((doc, i) => (
          <Fragment key={i}>
            {i > 0 && <Divider sx={{ my: 2, borderStyle: 'dashed' }} />}
            <Box
              sx={{
                bgcolor: '#fff',
                maxWidth: 700,
                mx: 'auto',
                p: { xs: 2, sm: 4 },
                boxShadow: 3,
                borderRadius: 1,
              }}
            >
              <PrintTemplate doc={doc} />
            </Box>
          </Fragment>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>סגירה</Button>
        <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
          הדפסה
        </Button>
      </DialogActions>

      {open && createPortal(<Box dir="rtl">{body}</Box>, mountEl)}
    </Dialog>
  );
}
