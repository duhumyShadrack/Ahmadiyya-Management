
import {useEffect,useState} from 'react'

export default function Dashboard(){

const [orders,setOrders]=useState([])

useEffect(()=>{
loadOrders()
},[])

async function loadOrders(){
const res=await fetch('/api/orders')
const data=await res.json()
setOrders(data)
}

return(
<main style={{padding:40,fontFamily:'Arial'}}>

<h1>Ahmadiyya Management</h1>

<h2>Orders</h2>

<ul>
{orders.map((o:any)=>(
<li key={o.id}>
Order #{o.id} - {o.status}
</li>
))}
</ul>

</main>
)
}
