import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Snackbar, Stack, Typography } from "@mui/material";
import Calculate from "@mui/icons-material/Calculate";
import Refresh from "@mui/icons-material/Refresh";
import Storage from "@mui/icons-material/Storage";
import LocalGasStation from "@mui/icons-material/LocalGasStation";
import Route from "@mui/icons-material/Route";
import { supabase } from "../../supabaseClient";
import { FrigoHesaplama } from "./FrigoYakitHakedis";
import "./HakedisPremium.css";

export default function FrigoHesaplamaPage() {
  const [yakitInfo,setYakitInfo]=useState(null);
  const [seferInfo,setSeferInfo]=useState(null);
  const [loading,setLoading]=useState(true);
  const [startTrigger,setStartTrigger]=useState(false);
  const [snackbar,setSnackbar]=useState({open:false,message:"",severity:"info"});
  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const [{data:yakit,error:yErr},{data:sefer,error:sErr}] = await Promise.all([
        supabase.from("frigo_yakit_tmp").select("*"),
        supabase.from("frigo_sefer_tmp").select("*"),
      ]);
      if(yErr) throw yErr; if(sErr) throw sErr;
      const yr=yakit||[], sr=sefer||[];
      setYakitInfo(yr.length?{fileName:"Geçici Yakıt Verisi",kayitSayisi:yr.length,preview:yr.slice(0,5),allRows:yr}:null);
      setSeferInfo(sr.length?{fileName:"Geçici Sefer Verisi",kayitSayisi:sr.length,preview:sr.slice(0,5),allRows:sr}:null);
    } catch(e){ setSnackbar({open:true,message:e?.message||"Veriler yüklenemedi",severity:"error"}); }
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const ready=!!yakitInfo&&!!seferInfo;
  return <Box className="hakedis-premium-page frigo-hesaplama-page" sx={{p:{xs:2,md:3},minHeight:"100vh"}}>
    <Paper className="premium-hakedis-hero" elevation={0}>
      <Box><Typography className="premium-kicker">HAKEDİŞ CONTROL CENTER</Typography><Typography variant="h4" fontWeight={900}>Frigo Hesaplama</Typography><Typography color="text.secondary">Frigo geçici yakıt ve sefer verilerini kontrol edip aynı hesaplama motorunu bağımsız çalıştırın.</Typography></Box>
      <Stack direction="row" spacing={1} flexWrap="wrap"><Chip icon={<LocalGasStation/>} label={`${yakitInfo?.kayitSayisi||0} yakıt`}/><Chip icon={<Route/>} label={`${seferInfo?.kayitSayisi||0} sefer`}/></Stack>
    </Paper>
    <Stack direction={{xs:"column",sm:"row"}} spacing={1.5} sx={{my:2}}>
      <Button variant="outlined" startIcon={<Refresh/>} onClick={load} disabled={loading}>Veriyi Yenile</Button>
      <Button variant="contained" startIcon={<Calculate/>} disabled={!ready||loading} onClick={()=>setStartTrigger(true)}>Hesaplamayı Başlat</Button>
      <Chip icon={<Storage/>} color={ready?"success":"warning"} label={ready?"Veriler hazır":"Yakıt ve sefer verisi bekleniyor"}/>
    </Stack>
    {loading ? <Paper className="premium-hakedis-panel"><Stack alignItems="center" spacing={1.5}><CircularProgress/><Typography>Geçici tablolar okunuyor…</Typography></Stack></Paper> :
      <FrigoHesaplama yakitInfo={yakitInfo} seferInfo={seferInfo} setSnackbar={setSnackbar} startTrigger={startTrigger} setStartTrigger={setStartTrigger}/>}
    <Snackbar open={snackbar.open} autoHideDuration={4200} onClose={()=>setSnackbar(x=>({...x,open:false}))}><Alert severity={snackbar.severity} onClose={()=>setSnackbar(x=>({...x,open:false}))}>{snackbar.message}</Alert></Snackbar>
  </Box>;
}
