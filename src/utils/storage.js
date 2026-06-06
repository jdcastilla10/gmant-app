const KEYS={usuarios:'gr_usuarios',sedes:'gr_sedes',activos:'gr_activos',contratistas:'gr_contratistas',mantenimientos:'gr_mantenimientos',cronograma:'gr_cronograma',session:'gr_session'}
const load=(key)=>{try{const v=localStorage.getItem(key);return v?JSON.parse(v):null}catch{return null}}
const save=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val))}catch(e){console.error(e)}}
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).substr(2,5)

const SEED={
  usuarios:[
    {id:'u1',username:'admin',password:'admin123',nombre:'Administrador',rol:'admin',email:'admin@gruporecordar.com',activo:true},
    {id:'u2',username:'tecnico1',password:'tec123',nombre:'Técnico Uno',rol:'tecnico',email:'tecnico@gruporecordar.com',activo:true}
  ],
  sedes:[
    {id:'s1',nombre:'Sede Principal',ciudad:'Bogotá',direccion:'Cra 7 #72-41'},
    {id:'s2',nombre:'Planta Norte',ciudad:'Medellín',direccion:'Av Industrial 120'}
  ],
  activos:[
    {id:'a1',identificacion:'MQ-001',nombre:'Compresor Atlas Copco GA30',sedeId:'s1',categoria:'Compresores',marca:'Atlas Copco',serial:'AC2021-0043',estado:'Activo',fechaAdq:'2021-03-15',valor:45000000,frecuencia:'Trimestral'},
    {id:'a2',identificacion:'MQ-002',nombre:'Montacargas Toyota 2.5T',sedeId:'s2',categoria:'Montacargas',marca:'Toyota',serial:'TY2022-8821',estado:'Activo',fechaAdq:'2022-01-20',valor:85000000,frecuencia:'Semestral'}
  ],
  contratistas:[
    {id:'c1',nombre:'TecnoServ S.A.S',nit:'900.123.456-1',email:'info@tecnoserv.co',telefono:'601 3456789'}
  ],
  mantenimientos:[
    {id:'m1',activoId:'a1',sedeId:'s1',tipo:'Preventivo',estado:'Completado',fechaProg:'2024-03-15',fechaEjec:'2024-03-15',descripcion:'Cambio de filtros y aceite. Revisión de válvulas.',gasto:1200000,contratista:'TecnoServ S.A.S',tecnico:'Juan Pérez',responsable:'Mario Gómez',docSoporte:'OT-2024-001',docBase64:'',docNombre:'',docTipo:'',ordenCompra:'OC-1045',observaciones:'Sin novedades',creadoPor:'Administrador',createdAt:new Date('2024-03-15').toISOString()}
  ],
  cronograma:[]
}

export function initData(){
  Object.keys(KEYS).forEach(k=>{
    if(k==='session')return
    if(!load(KEYS[k]))save(KEYS[k],SEED[k]||[])
  })
}

export const getAll=(k)=>load(KEYS[k])||[]
export const saveAll=(k,arr)=>save(KEYS[k],arr)
export const create=(k,item)=>{const arr=load(KEYS[k])||[];const n={...item,id:uid(),createdAt:new Date().toISOString()};arr.push(n);save(KEYS[k],arr);return n}
export const update=(k,item)=>{const arr=(load(KEYS[k])||[]).map(x=>x.id===item.id?{...item,updatedAt:new Date().toISOString()}:x);save(KEYS[k],arr);return item}
export const remove=(k,id)=>{const arr=(load(KEYS[k])||[]).filter(x=>x.id!==id);save(KEYS[k],arr);return arr}
export const getSession=()=>load(KEYS.session)
export const saveSession=(u)=>u?save(KEYS.session,u):localStorage.removeItem(KEYS.session)
export function login(username,password){const users=load(KEYS.usuarios)||[];return users.find(u=>u.username===username&&u.password===password&&u.activo)||null}
