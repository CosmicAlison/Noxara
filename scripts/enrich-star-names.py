#!/usr/bin/env python3
"""Enrich all HR entries from downloaded Yale V/50 data; no LLM-generated history.
Usage: python scripts/enrich-star-names.py /path/to/source-directory
Files: catalog.txt, notes.txt, constellations.txt (see docs/star-facts-sources.md).
"""
import collections, hashlib, json, math, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sources=Path(sys.argv[1])
facts_path=ROOT/'public/star-facts.json'
facts=json.loads(facts_path.read_text())
rows=json.loads((ROOT/'public/bsc5.json').read_text())
raw={str(int(line[:4])):line.ljust(197) for line in (sources/'catalog.txt').read_text().splitlines()}
assert set(raw)==set(facts)=={str(row[0]) for row in rows}
constellations={}
for line in (sources/'constellations.txt').read_text().splitlines():
 code,nominative,genitive=line.split(',');constellations[code]=(nominative.rstrip('*').replace('Pices','Pisces'),genitive)
greek=dict(zip('αβγδεζηθικλμνξοπρστυφχψω','Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega'.split()))
category={'C':'colour','D':'double and multiple stars','DYN':'dynamical parallax','G':'stellar groups','M':'miscellaneous information','N':'names','P':'polarization','R':'stellar size','RV':'velocity','S':'spectrum','SB':'spectroscopic binaries','VAR':'variability'}
notes=collections.defaultdict(list)
for line in (sources/'notes.txt').read_text().splitlines():
 hr=str(int(line[1:5]));count=int(line[5:7]);cat=line[7:11].strip().rstrip(':');remark=line[12:].strip()
 if count>1 and notes[hr] and notes[hr][-1]['category']==cat:notes[hr][-1]['text']+=' '+remark
 else:notes[hr].append({'category':cat,'text':remark})
CDS='https://cdsarc.cds.unistra.fr/ftp/V/50/'
NAMING='https://github.com/brettonw/YaleBrightStarCatalog/blob/master/constellationNames.txt'
PRIOR='https://github.com/brettonw/YaleBrightStarCatalog/blob/master/bsc5-short.json'
def number(text):
 try:return float(text.strip())
 except ValueError:return None
for hr,entry in facts.items():
 row=raw[hr];con=entry['constellation'];suffix=constellations.get(con,('',con))[1]
 source=[CDS+'catalog']
 if entry['properName']:
  name=entry['properName'];kind='proper_name';source=[PRIOR]
 elif entry['bayerDesignation'] and suffix:
  designation=re.sub('[α-ω]',lambda m:greek.get(m[0],m[0]),entry['bayerDesignation'])
  name=designation+' '+suffix;kind='bayer_designation';source+=[PRIOR,NAMING]
 elif entry['flamsteedNumber'] is not None and suffix:
  name=str(entry['flamsteedNumber'])+' '+suffix;kind='flamsteed_designation';source+=[NAMING]
 elif entry['objectKind']!='star' and row[4:14].strip():
  name=' '.join(row[4:14].split());kind='historical_catalogue_label'
 elif row[25:31].strip():
  name='HD '+str(int(row[25:31]));kind='henry_draper_designation'
 else:name='HR '+hr;kind='hr_designation'
 entry.update(name=name,nameType=kind,nameSourceUrls=source,constellationName=constellations.get(con,(None,None))[0])
 record_url='https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-source=V/50/catalog&HR='+hr
 notes_url='https://vizier.cds.unistra.fr/viz-bin/VizieR-5?-source=V/50/notes&HR='+hr
 entry.pop('catalogueNotes',None)
 if entry['notableFacts']:
  f=entry['notableFacts'][0];fun={'text':f['text'],'kind':'sourced_summary','sourceUrls':[f['sourceUrl']],'generated':False}
 elif notes[hr]:
  priorities=['N','G','M','D','VAR','S','SB','R','RV','P','C','DYN']
  n=min(notes[hr],key=lambda n:(priorities.index(n['category']) if n['category'] in priorities else 99,len(n['text'])))
  # Keep all qualifications (including "suspected", "optical" and "not") intact.
  fun={'text':'The 1991 Yale catalogue includes this note on '+category.get(n['category'],n['category'])+' for '+name+': “'+n['text']+'”','kind':'historical_catalogue_note','sourceUrls':[notes_url],'generated':False}
 else:
  # No invented biography: use a transparent calculation from sourced measurements.
  pmra=number(row[148:154]);pmdec=number(row[154:160]);velocity=number(row[166:170]);mag=number(row[102:107])
  if pmra is not None and pmdec is not None and math.hypot(pmra,pmdec)>=0.1:
   drift=round(math.hypot(pmra,pmdec),3)
   text=f'{name} is not fixed on the sky: the Yale proper-motion components imply a drift of about {drift} arcseconds per year. This describes angular motion, not its speed through space.'
   field=['pmRA','pmDE'];calculation='sqrt(pmRA^2 + pmDE^2); Yale pmRA already includes cos(dec)'
  elif velocity is not None and abs(velocity)>=10:
   direction='away from' if velocity>0 else 'toward'
   text=f'The Yale catalogue lists a radial velocity of {velocity:g} km/s for {name}: its motion along our line of sight was measured {direction} us. This is a historical catalogue value, not its full space velocity.'
   field=['RadVel'];calculation='positive radial velocity = receding; negative = approaching'
  elif entry['distanceLy'] is not None:
   years=round(entry['distanceLy'])
   text=f'At its catalogue-estimated distance of about {years:,} light-years, light from {name} takes roughly {years:,} years to reach us. The travel time inherits the uncertainty of the distance estimate.'
   field=['distanceLy'];calculation='light travel time in years approximately equals distance in light-years'
  elif mag is not None:
   text=f'{name} has a listed apparent visual magnitude of {mag:g}. The magnitude scale runs backwards: smaller values mean an object appears brighter.'
   field=['Vmag'];calculation=None
  else:
   text=f'{name} is a retained historical entry in the Yale catalogue, preserving its original HR {hr} identifier rather than describing an ordinary star with current stellar measurements.'
   field=['HR'];calculation=None
  fun={'text':text,'kind':'catalogue_based_explanation','sourceUrls':[record_url,CDS+'ReadMe'],'generated':True,'basedOnFields':field,'calculation':calculation}
  if field==['distanceLy']:fun['sourceUrls']+=['https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/hygdata_v41.csv']
 entry['funFact']=fun
assert len(facts)==9110 and all(e['name'].strip() and e['funFact']['text'] and e['funFact']['sourceUrls'] for e in facts.values())
facts_path.write_text(json.dumps(facts,ensure_ascii=False,separators=(',',':'))+'\n')
report={'records':len(facts),'nameTypes':dict(collections.Counter(e['nameType'] for e in facts.values())),'funFactTypes':dict(collections.Counter(e['funFact']['kind'] for e in facts.values())),'recordsWithCatalogueNotes':sum(bool(notes[hr]) for hr in facts),'totalCatalogueNotes':sum(len(notes[hr]) for hr in facts),'sourceSha256':{p:hashlib.sha256((sources/p).read_bytes()).hexdigest() for p in ['catalog.txt','notes.txt','constellations.txt']}}
(ROOT/'docs/star-facts-coverage.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
