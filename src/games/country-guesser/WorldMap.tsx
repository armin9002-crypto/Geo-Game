import { useEffect, useMemo } from 'react'
import worldDataRaw from 'world-atlas/countries-110m.json'
import { feature, mesh } from 'topojson-client'
import { geoGraticule, geoNaturalEarth1, geoPath } from 'd3-geo'
import type { FeatureCollection, Feature, GeometryObject } from 'geojson'
import type { Topology } from 'topojson-specification'

const worldData = worldDataRaw as Topology<GeometryObject>

interface WorldMapProps {
  highlightedId: number
  width?: number
  height?: number
}

export default function WorldMap({ highlightedId, width = 860, height = 520 }: WorldMapProps) {
  const countries = useMemo(
    () => feature(worldData, worldData.objects.countries) as FeatureCollection<GeometryObject, number>,
    [],
  )

  const highlightedFeature = useMemo(
    () => countries.features.find((feature) => Number(feature.id) === highlightedId),
    [countries, highlightedId],
  )

  useEffect(() => {
    if (highlightedId && !highlightedFeature) {
      console.warn(`WorldMap: highlighted country id ${highlightedId} not found in TopoJSON features.`)
    }
  }, [highlightedFeature, highlightedId])

  const projection = useMemo(
    () => geoNaturalEarth1().fitSize([width, height], countries),
    [countries, width, height],
  )

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection])
  const graticulePath = useMemo(() => pathGenerator(geoGraticule()()), [pathGenerator])
  const borderPath = useMemo(
    () => pathGenerator(mesh(worldData, worldData.objects.countries, (a, b) => a !== b) as unknown as Feature<GeometryObject, number>),
    [pathGenerator],
  )

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/50 shadow-2xl shadow-slate-950/30">
      <svg viewBox="0 0 860 520" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-label="World map">
        <rect width="860" height="520" fill="#0f172a" />
        <path d={graticulePath ?? undefined} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="0.4" />
        {countries.features.map((featureItem, index) => {
          const id = Number(featureItem.id)
          const isHighlighted = id === highlightedId
          return (
            <path
              key={`${featureItem.id}-${index}`}
              d={pathGenerator(featureItem) ?? undefined}
              fill={isHighlighted ? '#f59e0b' : '#475569'}
              stroke="#334155"
              strokeWidth={0.28}
            />
          )
        })}
        <path d={borderPath ?? undefined} fill="none" stroke="#94a3b8" strokeWidth="0.7" />
      </svg>
    </div>
  )
}
