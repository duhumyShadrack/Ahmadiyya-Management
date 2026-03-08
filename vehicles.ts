
export default function handler(req,res){

res.status(200).json([
{ id:1, vehicle_name:'Truck 1', status:'active', mileage:54000 },
{ id:2, vehicle_name:'Van 3', status:'in_shop', mileage:120400 }
])

}
