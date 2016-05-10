// ==UserScript==
// @name       Melhora SGRH Online TRESC
// @namespace  http://luizluca.blogspot.com/
// @version    0.13
// @description Adiciona mais informações ao SGRH
// @grant       none
// @updateURL https://raw.githubusercontent.com/luizluca/melhora-sgrh/master/melhora-sgrh.user.js
// @downloadURL https://raw.githubusercontent.com/luizluca/melhora-sgrh/master/melhora-sgrh.user.js
// @match      http://sistemas4.tre-sc.gov.br/sadAdmSRH/frequencianacional/espelhoPontoMensal.do*
// @copyright  2016+, Luiz Angelo Daros de Luca <luizluca@tre-sc.jus.br>, Luís Flávio Seelig <luisfs@tre-sc.jus.br>
// @require    http://code.jquery.com/jquery-latest.js
// ==/UserScript==

function pad (str, max) {
  return (""+str).length < max ? pad("0" + str, max) : str;
}

function time2str(aTime) {
    return (aTime<0?"-":"") + pad(Math.floor(Math.abs(aTime/60)),2) + ":" + pad(Math.abs(aTime%60),2);
}

function str2time(aTimeStr) {
    horas=parseInt(aTimeStr.substr(0,aTimeStr.indexOf(":")));
    minutos=parseInt(aTimeStr.substr(aTimeStr.indexOf(":")+1));
    if (aTimeStr[0]=="-") minutos=-minutos;
    return horas*60+minutos;
}

function translate(aDate,aLang) {
    switch(aLang) {
        case "pt-BR":
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
    aDate="01/"+aDate.
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
    aDate=aDate.split("/").reverse().join("/")
    return aDate;
}

/*jshint multistr: true */
function melhoraMesAtual() {
    extraInfo='<tr class="saldoSemCompensacao" style="display: none;">\
                  <th colspan="9" id="headerTotais" >Totais sem HE:</th>\
				  <th colspan="1" class="cellTotais">&nbsp;</th>\
                  <th id="thExtraSc" colspan="1" class="cellTotais">???</th>\
                  <th colspan="2" class="cellTotais">&nbsp;</th>\
               </tr>\
			   <tr class="saldoPositivo saldoNegativo" style="display: none;">\
                  <th colspan="9" class="saldoPositivo" id="headerTotais" style="display: none;">Atrasos:</th>\
				  <th colspan="9" class="saldoNegativo" id="headerTotais" style="display: none;">Hora-extra sem autorização:</th>\
                  <th colspan="1" class="cellTotais"></th>\
                  <th id="thExtra" colspan="1" class="cellTotais">???</th>\
                  <th colspan="2" class="cellTotais">&nbsp;</th>\
               </tr>\
               <tr class="saldoPositivo saldoNegativo" style="display: none;">\
                  <th colspan="9" id="headerTotais">Saldo a vencer neste mês:</th>\
                  <th colspan="1" class="cellTotais"></th>\
                  <th id="thSaldo" colspan="1" class="cellTotais">???</th>\
                  <th colspan="2" class="cellTotais saldoPositivo" style="display: none;">Gaste ou perca!</th>\
				  <th colspan="2" class="cellTotais saldoNegativo" style="display: none;">Compense ou pague!</th>\
               </tr>\
			   <tr class="saldoPositivo saldoNegativo" style="display: none;">\
				  <th colspan="9" id="headerTotais" class="" style="">Saldo do mês atual (tirando autorizados):</th>\
				  <th colspan="1" class="cellTotais"></th>\
                  <th id="saldoMesAtual" colspan="1" class="cellTotais" style="">???</th>\
				  <th colspan="2" class="cellTotais">&nbsp;</th>\
               </tr>\
               <tr id="trPendente" style="display: none;">\
                  <th colspan="9" id="headerTotais" class="saldoPositivo" style="display: none;">Você ainda precisa se atrasar:</th>\
				  <th colspan="9" id="headerTotais" class="saldoNegativo" style="display: none;">Você ainda precisa compensar:</th>\
                  <th colspan="1" class="cellTotais"></th>\
                  <th id="thPendente" colspan="1" class="cellTotais" style="background-color: #ff0000;">???</th>\
				  <th colspan="2" class="cellTotais">&nbsp;</th>\
               </tr>\
			   <tr id="trResolvido" style="display: none;">\
                  <th colspan="9" id="headerTotais" class="saldoPositivo" style="display: none;">Todo saldo do mês anterior foi aproveitado!</th>\
				  <th colspan="9" id="headerTotais" class="saldoNegativo" style="display: none;">Todo saldo do mês anterior foi compensado!</th>\
                  <th colspan="1" class="cellTotais"></th>\
                  <th id="thResolvido" colspan="1" class="cellTotais" style="">☺☮☺</th>\
				  <th colspan="2" class="cellTotais">&nbsp;</th>\
               </tr>';
    $("#trBotaoImprimir").before(extraInfo);
    $("#tblEspelhoPonto").after('<div id="mensagem" title="???" style="display:none"><p>???</p></div>');
    
    horasTotalEl=$(".cell10");
    horaExtraEl=$(".cell11");
    
    atrasos=0;
    hENaoHomologado=0;
    
    horasTotalEl.each(function( index, element ) {
        //atrasos += value;
    });
    horaExtraEl.each(function( index, element ) {
        extraStr = $(this).text();
        extra = str2time(extraStr);
        if (extra<0) {
                atrasos += extra;
        }
        if (extra>0) {
            	comAutorizacao=0;
              	$(this).siblings().filter(".cell13").find("img").each(function( index, element ) {
                    if ($(this).attr('title').match("autorização")) {
                    	comAutorizacao=1;
                    }
                });
            	if (!comAutorizacao) {
	                hENaoHomologado += extra;
    	        }
        }
    });
    $("#thExtraSc").text(time2str(hENaoHomologado+atrasos));
    $(".saldoSemCompensacao").show();
    
    saldoAVencerUtilizado=0;
    matricula = $("#cellMatricula").text();
    // nova fonte
    /*
    $.ajax({
        url: "http://sistemas4.tre-sc.gov.br/sadAdmSRH/frequencianacional/extratoBancoHoras.do",
        data: {
            acao: "lancamentoMensal",
            mesAnoSelecionado: "10/2015",
            "unidadeSelecionada.codigo": 0, //segurança disso?!
            "servidorSelecionado.matricula": matricula // Isto nao eh validado... pode ser qualquer pessoa >:)
        },
        type: "POST",
        success: function ( code )
        {
            html = $(code);
            console.log(code);
            alert(html.$("#tituloTblCreditosUtilizados"));
        },
        error: function ( code )
        {
            alert("Falha ao consultar Extrato de Horas");
        }
    });*/
    
    $.ajax({
        url: "http://sistemas4.tre-sc.gov.br/sadAdmSRH/frequencianacional/extratoBancoHoras.do?acao=consultar",
        success: function ( code, textStatus, request )
        {
            html = $(code);
            lingua = request.getResponseHeader('Content-Language');
            saldoAVencer=null;
            
            html.find("#tblSaldosAtuais").find("tr").each (function( index, element ) {
                validadeStr = $(this).find(".cellValidade").first().text();
                if (!validadeStr) return;
                validadeNum = Date.parse(translate(validadeStr,lingua));
                if (validadeNum == mesNum) {
                    saldoAVencerStr = $(this).find(".cellQtdHoras").first().text();
                    saldoAVencer = str2time(saldoAVencerStr);
                    $("#thSaldo").text(time2str(saldoAVencer));
                }
            });

            if (saldoAVencer==null) {
            	alert('Saldo a vencer para o mês ' +mes+ ' não encontrado!');
                $("#mensagem").text(code);
                return 0;
            }
            
            
            if (saldoAVencer<0) {
            	//$('#thExtraFinal').text(time2str(hENaoAutorizado + saldoAVencer));
                $("#thExtra").text(time2str(Math.abs(hENaoHomologado)));
                $(".saldoNegativo").show();
                pendente=-saldoAVencer-hENaoHomologado;
                saldoAVencerUtilizado=Math.max(saldoAVencer, -hENaoHomologado);
            } else {
                //$('#thExtraFinal').text(time2str(Math.min(saldoAVencer - atrasos,0)));
                $("#thExtra").text(time2str(Math.abs(atrasos)));
                $(".saldoPositivo").show();
                pendente=saldoAVencer+atrasos;
                saldoAVencerUtilizado=Math.min(saldoAVencer, -atrasos);
            }
            $(".saldoDesconhecido").hide();
            somar_saldo_mes();
            
            $("#thPendente").text(time2str(pendente));
            if (pendente>0) {
                $("#trPendente").show();
            } else {
                $("#trResolvido").show();
            }
        },
        error: function ( code )
        {
            alert("Falha ao consultar Extrato de Horas");
        }
    })
    
    extra_dia=0;
    saldoMesAtual=0;
    comAutorizacao_dia=0;
    function somar_saldo_mes() {
        //alert(comAutorizacao_dia)
        if (comAutorizacao_dia || (extra_dia < 0)) {
            saldoMesAtual = hENaoHomologado + atrasos + saldoAVencerUtilizado;
        } else {
        	saldoMesAtual = hENaoHomologado + atrasos + saldoAVencerUtilizado + extra_dia;
        }
        $("#saldoMesAtual").css('color', 'red');
    	$("#saldoMesAtual").text(time2str(saldoMesAtual));
    }
    somar_saldo_mes();
    
    /* Timer do horário atual */
    function estimar_ponto_hoje() {
        datas=$(".cell01");
        datas.each(function( index, element ) {
            dataStr = $(this).text();
            now=new Date();
            periodoEstimado=0;
            hojeStr=pad(now.getDate(),2) + "/" + pad(now.getMonth()+1,2) + "/" + now.getFullYear();
            horaStr=pad(now.getHours(),2) + ":" + pad(now.getMinutes(),2);
            if (dataStr==hojeStr) {

                /* TODO: Expediente pode ser variavel. Hoje fixo a 7 horas
                         para dias normais e 0 para feriados/final de semana.
                         De onde pegar esta info? Poderia abusar do bug
                         do total... mas deixa para lá */
                /* Sem expediente? (feriado, final de semana) */
                if ($(this).parent().hasClass("fundo2")) {
                	expediente=0;
                } else {
                    expediente=60*7;
                }
                /*
                 $(this).siblings().each(function( index2, element2 ) {
                        if ($(this).hasClass("cell10")) {
                            total_sistema=str2time($(this).text());
                        }
                        if ($(this).hasClass("cell11")) {
                            extra_sistema=str2time($(this).text());
                        }
                });
                expediente = total_sistema-*/
                
                $(this).siblings().each(function( index2, element2 ) {
                    if (($(this).text()==="") || $(this).hasClass("estimated")) {
                        $(this).text(horaStr);
                        $(this).css('color', 'red');
                        $(this).addClass("estimated");
                        return false;
                    }
                });
                entrando=true; total=0;
                $(this).siblings().each(function( index2, element2 ) {
                    if ($(this).text()!="") {
                        if (entrando) {
                            entrada=str2time($(this).text());
                        } else {
                            total+=str2time($(this).text())-entrada;
                            if ($(this).hasClass("estimated")) {
                            	periodoEstimado+=str2time($(this).text())-entrada;
                            }
                        }
                        entrando=!entrando;
                    } else {
                        return false;
                    }
                });
                if (periodoEstimado>0) {
                    $(this).siblings().each(function( index2, element2 ) {
                        if ($(this).hasClass("cell10")) {
                            faltando=str2time($(this).text());
                            $(this).text(time2str(total));
                            $(this).css('color', 'red');
                        }
                        if ($(this).hasClass("cell11")) {
                            extra_dia=total-expediente;
                            $(this).text(time2str(extra_dia));
                            $(this).css('color', 'red');
                        }
                    });
                }
                comAutorizacao_dia=0;
              	$(this).siblings().filter(".cell13").find("img").each(function( index, element ) {
                    if ($(this).attr('title').match("autorização")) {
                    	comAutorizacao_dia=1;
                    }
                });
            }
        });
        somar_saldo_mes();
    }
    setInterval(estimar_ponto_hoje, 1000);
    
    estimar_ponto_hoje();
}

function melhoraMesAnterior() {
    extraInfo='<tr class="linhaTotais">\
            <th colspan="9" class="alignRight">Saldo mês anterior:</th><th colspan="1">&nbsp;</th>\
            <th colspan="1" id="thSaldo">???</th>\
            <th colspan="5"></th>\
          </tr>\
		  <tr class="linhaTotais saldoPositivo saldoNegativo" style="display: none;">\
			<th colspan="9" class="alignRight saldoPositivo" style="display: none;">Atrasos Final (depois de descontado saldo do mês anterior):</th>\
			<th colspan="9" class="alignRight saldoNegativo" style="display: none;">Hora-extra sem autorização Final (depois de descontado saldo do mês anterior):</th>\
            <th colspan="1">&nbsp;</th>\
            <th colspan="1" id="thExtraFinal">???</th>\
            <th colspan="5" class="saldoPositivo" style="display: none;">-mínimo("Saldo mês anterior" - Atrasos, 0)</th>\
			<th colspan="5" class="saldoNegativo" style="display: none;">máximo("Hora-extra sem autorização" + "Saldo mês anterior",0)</th>\
          </tr>\
          <tr class="linhaTotais">\
            <th colspan="9" class="alignRight">Saldo no mês:</th><th colspan="1">&nbsp;</th>\
            <th colspan="1" id="thSaldoAtual">???</th>\
			<th colspan="5" class="saldoDesconhecido">???</th>\
            <th colspan="5" class="saldoPositivo" style="display: none;">"Hora-extra sem autorização" - "Atrasos Final"</th>\
            <th colspan="5" class="saldoNegativo" style="display: none;">"Hora-extra sem autorização Final" - Atrasos</th>\
          </tr>\
		  <tr class="linhaTotais saldoPositivo saldoNegativo" style="display: none;">\
            <th colspan="9" class="alignRight saldoPositivo" style="display: none;">Saldo no mês anterior utilizado:</th>\
			<th colspan="9" class="alignRight saldoNegativo" style="display: none;">Saldo no mês anterior compensado:</th>\
            <th colspan="1">&nbsp;</th>\
            <th colspan="1" id="thSaldoUsado">???</th>\
            <th colspan="5" class="saldoPositivo" style="display: none;">mínimo("Saldo mês anterior", Atrasos)</th>\
			<th colspan="5" class="saldoNegativo" style="display: none;">máximo("Saldo mês anterior", -"Hora-extra sem autorização")</th>\
          </tr>\
          <tr class="linhaTotais saldoPositivo saldoNegativo" style="display: none;">\
            <th colspan="9" class="alignRight saldoPositivo" style="display: none;">Saldo no mês anterior perdido:</th>\
			<th colspan="9" class="alignRight saldoNegativo" style="display: none;">Saldo no mês anterior a ser pago (pecúnia ou BH):</th>\
            <th colspan="1">&nbsp;</th>\
            <th colspan="1" id="thSaldoExpirado">???</th>\
            <th colspan="5" class="saldoPositivo" style="display: none;">máximo("Saldo mês anterior" - Atrasos, 0)</th>\
			<th colspan="5" class="saldoNegativo" style="display: none;">mínimo("Hora-extra sem autorização" + "Saldo mês anterior", 0)</th>\
          </tr>\
		';
    $("#trBotaoImprimir").before(extraInfo);
    
	$(".alignRight").each(function( index, element ) {
        if ($(this).text().match("Ajustados:")) {
            atrasosEl=$(this).next().next();
            atrasosStr=atrasosEl.text();
            // Retira sinal dos atrasos (sempre negativo)
            atrasos=-str2time(atrasosStr);
            $(this).text("Atrasos:");
            atrasosEl.text(time2str(atrasos));
            $(this).next().next().next().text("soma dos excedentes negativos, consome saldo do mês anterior se positivo");
       	}
        if ($(this).text().match("Horas Homologadas:")) {
            $(this).text("Hora-extra com autorização (não usado pelo TRESC):");
            $(this).parent().hide();
       	}
        if ($(this).text().match("Não-Homologadas:")) {
            hENaoAutorizadoEl=$(this).next();
            hENaoAutorizadoStr=hENaoAutorizadoEl.text();
            hENaoAutorizado=str2time(hENaoAutorizadoStr);
            $(this).text("Hora-extra sem autorização:");
            $(this).next().next().text("soma dos excedentes positivos, compensa saldo do mês anterior se negativo");
            $(this).next().next().attr('colspan',5);
            $(this).after('<th colspan="1">&nbsp;</th>');
       	}
    });
    
/*  Esta info não existe mais pois os bancos estao juntos!
    $.ajax({
        url: "http://sistemas4.tre-sc.gov.br/sadAdmSRH/frequencianacional/extratoBancoHoras.do?acao=consultar",
        success: function ( code )
        {
            html = $(code);
            html.find("td").filter(".cellMesAno").each(function( index, element ) {
                //HACK: Usando match pois o mes atual tem espaços
                if ($(this).text().match(mesAnterior)) {
                    saldoAVencerStr = $(this).siblings().filter(".cellHorasRemanescentes").first().text();
                    saldoAVencer = str2time(saldoAVencerStr);
                    //saldoAVencer += 600;
                    $("#thSaldo").text(time2str(saldoAVencer));
                    return;
                }
                if ($(this).text().match(mes)) {
                    saldoAtual=str2time($(this).siblings().filter(".cellHorasRemanescentes").text());
                    saldoExpirado=str2time($(this).siblings().filter(".cellHorasVencidas").text());
                    $("#thSaldoAtual").text(time2str(saldoAtual));
                  	$("#thSaldoExpirado").text(time2str(saldoExpirado));
                    return;
                }
            });
            
            if (saldoAVencer<0) {
                extraFinal=hENaoAutorizado + saldoAVencer
                saldoUsado=Math.max(-hENaoAutorizado, saldoAVencer);
                 $(".saldoNegativo").show();
            } else {
                extraFinal=Math.abs(Math.min(saldoAVencer - atrasos,0));
                saldoUsado=Math.min(atrasos, saldoAVencer);
                $(".saldoPositivo").show();
            }
            $('#thExtraFinal').text(time2str(extraFinal));
            $("#thSaldoUsado").text(time2str(saldoUsado));
            $(".saldoDesconhecido").hide();
			
            
            if ($("#thSaldoAtual").text()=="???") {
            	// Saldo de um mês não fechado!
                if (saldoAVencer<0) {
                    saldoAtual=extraFinal - atrasos;
                    alert(time2str(hENaoAutorizado));
                    alert(time2str(saldoAVencer));
                    saldoExpirado=Math.min(hENaoAutorizado+saldoAVencer,0);
                } else {
                    saldoAtual=hENaoAutorizado -extraFinal;
                    saldoExpirado=Math.max(saldoAVencer - atrasos,0);
                }
                $("#thSaldoAtual").css('color', 'red');
                $("#thSaldoExpirado").css('color', 'red');
                $("#thSaldoAtual").text(time2str(saldoAtual));
                $("#thSaldoExpirado").text(time2str(saldoExpirado));
                //máximo("Saldo mês anterior" - Atrasos, 0)

                //$("#thSaldoAtual").text("!!!");
              	//$("#thSaldoExpirado").text("!!!");
            }
        },
        error: function ( code )
        {
            alert("Falha ao consultar Extrato de Horas");
        }
    });*/
}

mes=$("input[name$='dataSelecionada']").val().substr(3);
mesData=new Date(mes.substr(3,4),mes.substr(0,2)-1,1);
if (mes==="") {
    agora=new Date();
    mesData=new Date(agora.getFullYear(),agora.getMonth(),1);
    mes=pad(mesData.getMonth()+1,2)+"/"+pad(mesData.getFullYear(),4);
}
mesNum=Date.parse(mesData);
mesAnteriorData=new Date(mesData.getFullYear(),mesData.getMonth()-1,1);
mesAnterior=pad(mesAnteriorData.getMonth()+1,2)+"/"+pad(mesAnteriorData.getFullYear(),4);

referencia = $("#conteudo").find("span").filter(".vermelho").text();
if (referencia != "Mês Corrente") {
    //HACK: Mes sem acento?
    if ((referencia == "Mes Fechado") || (referencia == "Mes Não Fechado") || (referencia == "Mês Fechado") || (referencia == "Mês Não Fechado")) {
        melhoraMesAnterior();
    } else {
        alert("Tipo de página desconhecida!: "+ referencia);
    }
} else {
    melhoraMesAtual();
}
