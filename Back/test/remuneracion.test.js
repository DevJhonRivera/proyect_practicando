import test from "node:test";
import assert from "node:assert/strict";
import { validarRemuneracion } from "../src/modules/users/remuneracion.js";
import { calcularManoObra } from "../src/modules/coordinacion/manoObra.js";
test("valida las tres modalidades y exige un salario positivo cuando corresponde", () => {
 assert.deepEqual(validarRemuneracion({modalidad:"SOLO_COMISION",salarioMensual:900}), {modalidad:"SOLO_COMISION",salarioMensual:0});
 for (const modalidad of ["SOLO_SALARIO","SALARIO_COMISION"]) {
  assert.equal(validarRemuneracion({modalidad,salarioMensual:1750905}).salarioMensual,1750905);
  for (const salarioMensual of [0,-1,1.5,"abc",null]) assert.throws(()=>validarRemuneracion({modalidad,salarioMensual}));
 }
 assert.throws(()=>validarRemuneracion({modalidad:"OTRO"}));
});
const orden = {polarizados:[{material:"PELICULA",porcentaje:"700",valor:100000}],comercial:{valorVenta:100000,totalAcordado:80000}};
const servicio = {servicio:"POLARIZADO 1"};
test("solo salario no recibe tarifa fija ni porcentaje excepcional o manual",()=>{
 const usuarios=new Map([["a",{remuneracion:{modalidad:"SOLO_SALARIO"}}]]);
 const pagos=calcularManoObra(orden,servicio,[{instaladorId:"a",valorInstalacion:90000,porcentajeManoObra:50}],{"FIJO|PELICULA:700":10000},usuarios);
 assert.equal(pagos[0].valorInstalacion,0);
});
test("un equipo mixto conserva participaciones sin trasladar la comision del asalariado",()=>{
 const usuarios=new Map([["a",{remuneracion:{modalidad:"SOLO_SALARIO"}}],["b",{remuneracion:{modalidad:"SALARIO_COMISION"}}]]);
 const filas=[{instaladorId:"a",calcularManoObra:true,participacionManoObra:40},{instaladorId:"b",calcularManoObra:true,participacionManoObra:60}];
 const pagos=calcularManoObra(orden,servicio,filas,{"PELICULA:700":10},usuarios);
 assert.deepEqual(pagos.map(p=>p.valorInstalacion),[0,4800]);
 assert.throws(()=>calcularManoObra(orden,servicio,filas,{},usuarios),/Falta configurar/);
});
test("instaladores existentes mantienen la comision y salario mas comision usa la misma tarifa",()=>{
 for (const modalidad of [undefined,"SOLO_COMISION","SALARIO_COMISION"]) {
  const pagos=calcularManoObra(orden,servicio,[{instaladorId:"b",calcularManoObra:true}],{"PELICULA:700":10},new Map([["b",{remuneracion:{modalidad}}]]));
  assert.equal(pagos[0].valorInstalacion,8000);
 }
});
