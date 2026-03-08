
import {useEffect,useState} from 'react'

export default function Fleet(){

const [vehicles,setVehicles]=useState([])

useEffect(()=>{
loadVehicles()
},[])

async function loadVehicles(){
const res=await fetch('/api/vehicles')
const data=await res.json()
setVehicles(data)
}

return(

<div style={{padding:40}}>

<h1>Fleet Management</h1>

<table>

<thead>
<tr>
<th>Vehicle</th>
<th>Status</th>
<th>Mileage</th>
</tr>
</thead>

<tbody>

{vehicles.map((v:any)=>(
<tr key={v.id}>
<td>{v.vehicle_name}</td>
<td>{v.status}</td>
<td>{v.mileage}</td>
</tr>
))}

</tbody>

</table>

</div>

)
}
