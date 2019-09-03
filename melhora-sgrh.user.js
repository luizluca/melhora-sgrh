// ==UserScript==
// @name       Melhora Portal do Servidor
// @namespace  https://github.com/luizluca/melhora-sgrh
// @version    1.6
// @description Adiciona mais informações ao Portal do Servidor
// @grant       none
// @updateURL https://raw.githubusercontent.com/luizluca/melhora-sgrh/master/melhora-sgrh.user.js
// @downloadURL https://raw.githubusercontent.com/luizluca/melhora-sgrh/master/melhora-sgrh.user.js
// @match      https://sistemas4.tre-sc.gov.br/sadAdmSRH/frequencianacional/espelhoPontoMensal.do*
// @match      https://sistemas5.tre-sc.gov.br/portal-servidor/EspelhoPontoMesAction_recuperar.action
// @match      https://sistemas5.tre-sc.gov.br/portal-servidor/_/EspelhoPontoMesAction_recuperar
// @match      https://sistemas5.tre-sc.gov.br/portal-servidor/EspelhoPontoMesAction_recuperar
// @match      https://sistemas5.tre-sc.gov.br/portal-servidor/EspelhoPontoMesAction_formEspelhoPontoMes_consultar
// @copyright  2016+, Luiz Angelo Daros de Luca <luizluca@tre-sc.jus.br>, Luís Flávio Seelig <luisfs@tre-sc.jus.br>
// @require    https://code.jquery.com/jquery-latest.js
// ==/UserScript==

/*global $:false, jQuery:false */
/*jshint multistr: true */

function pad (str, max) {
  return (""+str).length < max ? pad("0" + str, max) : str;
}

function time2str(aTime,hourMinuteSecond=false) {
    if (isNaN(aTime)) aTime=0;

    var aSig=((aTime<0)?"-":"");
    var aHour;
    var aMin;
    var aTimeStr="";
    if (hourMinuteSecond) {
        // Second resolution
        aTime=Math.floor(aTime/(1000));
        var aSec=aTime%60;
        aTimeStr=":"+pad(Math.abs(aSec),2);
        aTime=(aTime-aSec)/60;
    } else {
        // Minute resolution
        aTime=Math.floor(aTime/(1000*60));
    }
    aMin=aTime%60;
    aTimeStr=":"+pad(Math.abs(aMin),2)+aTimeStr;
    aHour=(aTime-aMin)/60;

    return aSig+pad(Math.abs(aHour),2)+aTimeStr;
}

function str2time(aTimeStr) {
    var horas=parseInt(aTimeStr.substr(0,aTimeStr.indexOf(":")));
    var minutos=parseInt(aTimeStr.substr(aTimeStr.indexOf(":")+1));
    if (aTimeStr[0]=="-") minutos=-minutos;
    return (horas*60+minutos)*60*1000;
}

function str2date(aDate,aLang) {
    switch(aLang) {
        case "pt_BR":
            aDate=aDate.
               replace(/Fev/i,"Feb").
               replace(/Abr/i,"Apr").
               replace(/Mai/i,"May").
               replace(/Ago/i,"Aug").
               replace(/Set/i,"Sep").
               replace(/Out/i,"Oct").
               replace(/Dez/i,"Dec").
               toString();
    }
    aDate=aDate.
        replace(/Jan/i,"01").
        replace(/Fev/i,"02").
        replace(/Mar/i,"03").
        replace(/Apr/i,"04").
        replace(/May/i,"05").
        replace(/Jun/i,"06").
        replace(/Jul/i,"07").
        replace(/Aug/i,"08").
        replace(/Sep/i,"09").
        replace(/Oct/i,"10").
        replace(/Nov/i,"11").
        replace(/Dec/i,"12").
        toString();
    aDate=aDate.split("/").reverse().join("/");
    return new Date(aDate);
}

Date.prototype.days_in_month = function() {
    return (new Date(this.getFullYear(),this.getMonth()+1,0)).getDate();
};

class EspelhoPonto {
    constructor(_tabela) {
        if (_tabela === undefined) {
            this.tabela=$("#tblEspelhoPontoMesCorrente tr");
            this.async=true;
        } else {
            this.tabela=_tabela;
            this.async=false;
        }
        this.mes=str2date(this.tabela[1].children[0].innerHTML,"pt_BR");
        this.num_dias=this.mes.days_in_month()
        this.saldo_mes=null;
        this.saldo_mes_anterior=null;
        this.atualiza_tudo();
    }

    agora() {
        var agora=new Date();
        var hoje=new Date(agora.getFullYear(),agora.getMonth(),agora.getDate())
        var hoje_str=hoje.toLocaleString().slice(0, 10);
        var found=this.tabela.find("td:contains('"+hoje_str+"')")
        if (found.length>0) {
            var linha=found.parent();
            var soma_dia=0
            var expediente=0;
            if ($(linha).hasClass("fundo2")) {
                expediente=0;
            } else {
                // Expediente 8h a partir de Abril de ano eleitoral
                if ((hoje.getFullYear()%2==0) && (hoje.getMonth() >= 3)) {
                    expediente=7*60*60*1000;
                } else {
                    expediente=6*60*60*1000;
                }
            }

            for (var j=0;j<3;j++) {
                var entrada=linha.children()[j*2+1].innerHTML;
                if (entrada=="") break;
                entrada=str2time(entrada);
                if (isNaN(entrada)) break;
                var saida=linha.children()[j*2+2];
                if ($(saida).hasClass("dinamico") || (saida.innerHTML=="")) {
                    saida=(agora.getTime()-hoje.getTime())
                    this.atualiza_campo(linha.children()[j*2+2],time2str(saida))
                } else {
                    saida=str2time(saida.innerHTML);
                }
                soma_dia+=saida-entrada
            }
            if (j>0) {
                this.atualiza_campo(linha.children()[8],time2str(soma_dia));
                this.atualiza_campo(linha.children()[9],time2str(soma_dia-expediente));
            }
        } else {
            // Mẽs anterior mas não fechado ainda.
        }
        this.recarrega();
        this.atualiza_resumos();
    }

    recarrega(){
        this.jornada=new Array(this.num_dias);
        this.excedentes=new Array(this.num_dias);
        this.autorizacoesHE=new Array(this.num_dias);
        for (var i=1;i<=this.num_dias;i++) {
            var linha=this.tabela[i]
            var dia=linha.children[0].innerHTML;
            //for (var j=0;j<3;j++) {
            //    var entrada=linha.children[j*2+1].innerHTML;
            //    var saida=linha.children[j*2+2].innerHTML;
            //}
            var total=0;
            var excedente=0;
            var autorizacaoHE=false;
            if (linha.children.length==16) {
                total=str2time(linha.children[8].innerHTML);
                excedente=str2time(linha.children[9].innerHTML);
                autorizacaoHE=linha.children[15].children.length>0;
            }
            this.jornada[i-1]=total;
            this.excedentes[i-1]=excedente;
            this.autorizacoesHE[i-1]=autorizacaoHE
        }
    }

    jornada_mensal() {
        var soma=0;
        for (var i=0;i<this.num_dias;i++) {
            soma+=this.jornada[i];
        }
        return soma;
    }

    atrasos(){
        var soma=0;
        for (var i=0;i<this.num_dias;i++) {
            if (this.excedentes[i]<0) {
                soma-=this.excedentes[i];
            }
        }
        return soma;
    }

    extras(){
        var soma=0;
        for (var i=0;i<this.num_dias;i++) {
            if (this.excedentes[i]>0) {
                soma+=this.excedentes[i];
            }
        }
        return soma;
    }

    extras_autorizacao(autorizado){
        var soma=0;
        for (var i=0;i<this.num_dias;i++) {
            if ((this.excedentes[i]>0) && (this.autorizacoesHE[i]==autorizado)) {
                soma+=this.excedentes[i];
            }
        }
        return soma;
    }

    atualiza_tudo(){
        var mes_anterior=new Date(this.mes.getFullYear(),this.mes.getMonth()-1,1);
        var mes_ano_anterior=(mes_anterior.getMonth()+1)+"/"+mes_anterior.getFullYear()
        var espelho=this;
        //console.log("Buscando saldo de "+mes_ano_anterior+"... async="+this.async);
        $.ajax({
            url: "https://sistemas5.tre-sc.gov.br/portal-servidor/BancoHorasAction_recuperarExtrato",
            async: this.async,
            success: function ( code, textStatus, request )
            {
                var html = $(code);
                var lingua = request.getResponseHeader('Content-Language');
                html.find("table").find("tr").each (function( index, linha ) {
                    var mes=linha.children[1].innerHTML;
                    if (mes != mes_ano_anterior) return true;
                    espelho.saldo_mes_anterior=str2time(linha.children[5].innerHTML)
                    //console.log("saldo: "+time2str(espelho.saldo_mes_anterior));
                    //console.log("atrasos:",time2str(espelho.atrasos()));
                    //console.log("extras:",time2str(espelho.extras()));
                    //console.log("extras autorizados:",time2str(espelho.extras_autorizacao(true)));
                    //console.log("extras n autorizados:",time2str(espelho.extras_autorizacao(false)));
                    //console.log("jornada:",time2str(espelho.jornada_mensal()));
                    espelho.agora();
                    return false;
                });
                if (espelho.saldo_mes_anterior == null) {
                    console.log ("Sem saldo do mês anterior "+mes_ano_anterior+". Posso tentar estimar pelo espelho do mês "+mes_ano_anterior);
                    $.ajax({
                        type: 'post',
                        async: false,
                        data: { "unidadeSelecionada.idUnidade":$("#unidadeSelecionada_idUnidade").val(), "servidorSelecionado.matricula":$("#servidorSelecionado_matricula").val(), "anoSelecionado:":mes_anterior.getFullYear(), "mesSelecionado":mes_anterior.getMonth()+1},
                        success: function ( code, textStatus, request )
                        {
                            var html = $(code);
                            var tabela_mes_anterior=html.find("#tblEspelhoPontoMesCorrente tr");
                            var espelho_mes_anterior=new EspelhoPonto(tabela_mes_anterior);
                            espelho.saldo_mes_anterior=espelho_mes_anterior.saldo_mes;
                            espelho.agora();
                        },
                        error: function ( code )
                        {
                            alert("Falha ao consultar o espelho do mês anterior para tentar obter o saldo estimado");
                        }
                    });
                }
            },
            error: function ( code )
            {
                alert("Falha ao consultar saldo de horas do mês anterior");
            }
        });
    }

    atualiza_resumos(){

        var atrasos=this.atrasos()
        var extras=this.extras()
        var extras_naoautorizados=this.extras_autorizacao(false)

        // Totais
        this.atualiza_campo(this.tabela[this.num_dias+1].children[1],time2str(this.jornada_mensal()))
        this.atualiza_campo(this.tabela[this.num_dias+1].children[2],time2str(extras-atrasos))

        // Banco de horas
        var saldo_avencer=this.saldo_mes_anterior
        if (saldo_avencer==null) {
            console.log("Ainda sem saldo do mês anterior")
            return true
        }
        var saldo_consumido=0
        var pendente=0
        var residuo=0
        var msg_pendente=""
        var saldo_mes=0

        //saldo_avencer=-5*60*60*1000
        //console.log("saldo a vencer:",time2str(saldo_avencer))
        //console.log("atrasos:",time2str(atrasos));

        if (saldo_avencer>0) {
             // Estamos sobreando, consuma dos atrasos
            pendente=Math.max(0,saldo_avencer-atrasos);
            saldo_consumido=Math.min(saldo_avencer, atrasos);
            msg_pendente="Gaste ou perca!"
        } else {
            // Estamos devendo, consuma dos extras não homologados
            pendente=Math.min(0,saldo_avencer+extras_naoautorizados);
            saldo_consumido=Math.max(saldo_avencer, -extras_naoautorizados);
            msg_pendente="Compense ou pague!"
        }
        residuo=saldo_avencer-saldo_consumido
        saldo_mes=extras_naoautorizados-atrasos+saldo_consumido
        //console.log("pendente:",time2str(pendente))
        //console.log("consumido:",time2str(saldo_consumido))

        this.atualiza_campo(this.campo("Horas Utilizadas do Banco de Horas:"),time2str(saldo_consumido))
        this.atualiza_campo(this.campo("Resíduo de Horas:"),time2str(pendente))
        if (pendente==0) msg_pendente="☺☮☺"
        this.atualiza_campo($(this.campo("Resíduo de Horas:")).next()[0],msg_pendente)
        this.atualiza_campo(this.campo("Saldo do Banco de Horas:"),time2str(saldo_avencer))
        this.atualiza_campo($(this.campo("Saldo do Banco de Horas:")).next()[0],"Saldo atual para o próximo mês: "+time2str(saldo_mes))
        this.saldo_mes=saldo_mes
    }

    campo(label) {
        var found=this.tabela.find("td:contains('"+label+"')")
        if (found.lentgh==0) return;
        return found.next()[0];
    }

    atualiza_campo(campo,valor) {
        $(campo).css('color', 'red');
        $(campo).addClass('dinamico');
        campo.innerHTML=valor;
    }
}

function on_minuto() {
    espelho.agora()
}

if ($("td:contains('Mês fechado pelo sistema.')").length==0) {
    // Mês não fechado
    var espelho=new EspelhoPonto();
    espelho.agora();

    // Roda na virada do minuto
    setTimeout(function() {
        on_minuto();
        setInterval(on_minuto, 60000);
    }, (60 - (new Date()).getSeconds()) * 1000);

    // Arruma o alinhamento dos totais
    $(".cellTotais").css("text-align","center");
} else {
    // Mês fechado
}

// Evita conflitos se a página já usa jQuery
this.$ = this.jQuery = jQuery.noConflict(true);
