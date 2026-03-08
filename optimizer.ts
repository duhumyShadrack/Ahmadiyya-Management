
export function optimizeRoute(stops:any[]){

return stops.sort((a,b)=>a.distance-b.distance)

}
