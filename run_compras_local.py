"""
Wrapper local para o pipeline de Compras Agrotis, para rodar no servidor-t360
via WSL sem depender dos mounts /sessions/*/mnt/... do sandbox efemero do Cowork.
Reaproveita os scripts build_*.py sem alteracao (eles so dependem de variaveis
de ambiente: SCRATCH_DIR, FB_LIB_PATH, FB_GDB_PATH), replicando a mesma logica
de orquestracao do run_all.py original.
"""
import base64, glob, os, shutil, subprocess, sys, datetime, json

ESTOQUE = '/mnt/c/Safebd/Dados/Estoque'
DROPBOX_CLAUDE = '/mnt/c/Users/gilberto/Dropbox/Claude'
DROPBOX_GITHUB = '/mnt/c/Users/gilberto/Dropbox/GitHub'
SCRIPTS = os.path.join(ESTOQUE, '_scripts_compras')
ENGINE = os.path.join(ESTOQUE, '_firebird_engine')
assert os.path.isdir(SCRIPTS), f"Pasta de scripts nao encontrada: {SCRIPTS}"
assert os.path.isdir(ENGINE), f"Motor Firebird nao encontrado: {ENGINE}"

# garantir fdb (mesma logica do run_all.py: usa o tar.gz persistido em _scripts_compras)
def _ensure_fdb():
    try:
        import fdb  # noqa
        return
    except ImportError:
        pass
    import glob as _glob, site, tarfile, tempfile
    tar_candidates = _glob.glob(os.path.join(SCRIPTS, 'fdb-*.tar.gz'))
    assert tar_candidates, 'fdb nao instalado e nenhum fdb-*.tar.gz encontrado em _scripts_compras'
    tar_path = tar_candidates[0]
    print(f'fdb nao encontrado - instalando a partir de {tar_path}')
    with tempfile.TemporaryDirectory() as tmpdir:
        with tarfile.open(tar_path) as tf:
            tf.extractall(tmpdir)
        extracted = _glob.glob(os.path.join(tmpdir, 'fdb-*'))
        assert extracted
        pkg_src = os.path.join(extracted[0], 'fdb')
        user_site = site.getusersitepackages()
        os.makedirs(user_site, exist_ok=True)
        pkg_dst = os.path.join(user_site, 'fdb')
        if os.path.isdir(pkg_dst):
            shutil.rmtree(pkg_dst)
        shutil.copytree(pkg_src, pkg_dst)
    import importlib
    importlib.invalidate_caches()
    import fdb  # noqa
    print('fdb instalado com sucesso.')

_ensure_fdb()

def _ensure_openpyxl():
    try:
        import openpyxl  # noqa
        return
    except ImportError:
        pass
    import json as _json, urllib.request, zipfile, io, site
    d = _json.load(urllib.request.urlopen('https://pypi.org/pypi/openpyxl/json'))
    url = None
    for f in d['urls']:
        if f['filename'].endswith('.whl'):
            url = f['url']; break
    assert url, 'nao achei wheel do openpyxl no PyPI'
    print('baixando openpyxl:', url)
    data = urllib.request.urlopen(url).read()
    user_site = site.getusersitepackages()
    os.makedirs(user_site, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(data)).extractall(user_site)
    # openpyxl depende de et_xmlfile
    d2 = _json.load(urllib.request.urlopen('https://pypi.org/pypi/et_xmlfile/json'))
    url2 = [f['url'] for f in d2['urls'] if f['filename'].endswith('.whl')][0]
    data2 = urllib.request.urlopen(url2).read()
    zipfile.ZipFile(io.BytesIO(data2)).extractall(user_site)
    import importlib
    importlib.invalidate_caches()
    import openpyxl  # noqa
    print('openpyxl instalado com sucesso.')

_ensure_openpyxl()

RUN_ID = str(os.getpid())
GDB_SRC = os.path.join(ESTOQUE, 'SAFEBDRESTORE.GDB')
SCRATCH = os.path.expanduser(f'~/compras_scratch_{RUN_ID}')
os.makedirs(SCRATCH, exist_ok=True)

GDB_LOCAL = f'{SCRATCH}/test_{RUN_ID}.gdb'
ENGINE_LOCAL = f'{SCRATCH}/fbmin_{RUN_ID}'
FBLOCK_LOCAL = f'{SCRATCH}/fblock_{RUN_ID}'

try:
    print('Copiando banco (1.7GB, pode levar um tempo)...')
    shutil.copyfile(GDB_SRC, GDB_LOCAL)
    print('Copia concluida.')

    if os.path.isdir(ENGINE_LOCAL):
        shutil.rmtree(ENGINE_LOCAL)
    os.makedirs(ENGINE_LOCAL, exist_ok=True)
    for item in os.listdir(ENGINE):
        src = os.path.join(ENGINE, item)
        dst = os.path.join(ENGINE_LOCAL, item)
        if os.path.islink(src) and not os.path.exists(src):
            print(f'  Ignorando symlink quebrado: {item}')
            continue
        if os.path.isfile(src):
            shutil.copy2(src, dst)
        elif os.path.isdir(src):
            shutil.copytree(src, dst)
    os.makedirs(FBLOCK_LOCAL, exist_ok=True)
    os.chmod(FBLOCK_LOCAL, 0o777)
    env = os.environ.copy()
    env['LD_LIBRARY_PATH'] = ENGINE_LOCAL
    env['FIREBIRD_LOCK'] = FBLOCK_LOCAL
    env['FB_LIB_PATH'] = os.path.join(ENGINE_LOCAL, 'libfbembed.so')
    env['FB_GDB_PATH'] = GDB_LOCAL
    env['SCRATCH_DIR'] = SCRATCH
    env['PYTHONPATH'] = os.environ.get('PYTHONPATH', '')

    def run(script_name):
        path = os.path.join(SCRIPTS, script_name)
        print(f'--- rodando {script_name} ---')
        subprocess.run([sys.executable, path], check=True, env=env, cwd=SCRATCH)

    run('build_compras.py')
    run('build_compras_f5_full.py')
    run('build_json.py')
    run('build_json_f5.py')
    run('build_futuras.py')

    JSON_F2 = os.path.join(SCRATCH, 'product_data_agrotis.json')
    JSON_F5 = os.path.join(SCRATCH, 'product_data_agrotis_f5.json')

    with open(JSON_F5, encoding='utf-8') as f:
        data_f5 = json.load(f)
    for rec in data_f5.values():
        rec['transferencias_internas'] = []
    with open(JSON_F5, 'w', encoding='utf-8') as f:
        json.dump(data_f5, f, ensure_ascii=False, default=str)

    with open(JSON_F2, encoding='utf-8') as f:
        data_f2_str = f.read()
    with open(JSON_F5, encoding='utf-8') as f:
        data_f5_str = f.read()
    with open(os.path.join(SCRIPTS, 'template_agrotis_test.html'), encoding='utf-8') as f:
        template = f.read()

    APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxm4H0aq0__qs33ODXg7kQCQ0nJlC7PsL47FX1Ho2q-CLtLtmh3mt4-d0AqZTLmLtCA/exec'

    LOGO_PATH = os.path.join(SCRIPTS, 'logo_rural.png')
    with open(LOGO_PATH, 'rb') as f:
        LOGO_BASE64 = base64.b64encode(f.read()).decode('ascii')

    hoje = datetime.date.today().strftime('%d/%m/%Y')
    n_products = len(json.loads(data_f2_str))
    futuras_path = os.path.join(SCRATCH, 'compras_futuras.json')
    with open(futuras_path, 'r', encoding='utf-8') as f:
        futuras_str = f.read()

    out = template.replace('__DATA_JSON_F5__', data_f5_str)
    out = out.replace('__DATA_JSON__', data_f2_str)
    out = out.replace('__PRODUCT_COUNT__', str(n_products))
    out = out.replace('__GENERATED_DATE__', f'{hoje} (via Agrotis - atualizacao automatica)')
    out = out.replace('__SHEET_ID__', '')
    out = out.replace('__APPS_SCRIPT_URL__', APPS_SCRIPT_URL)
    out = out.replace('__LOGO_BASE64__', LOGO_BASE64)
    out = out.replace('__COMPRAS_FUTURAS__', futuras_str)

    stamp = datetime.date.today().isoformat()

    html_out = os.path.join(ESTOQUE, 'compras.html')
    with open(html_out, 'w', encoding='utf-8') as f:
        f.write(out)

    if os.path.isdir(DROPBOX_GITHUB):
        github_html = os.path.join(DROPBOX_GITHUB, 'compras.html')
        shutil.copy2(html_out, github_html)
        print(f'HTML copiado para GitHub: {github_html}')
    else:
        print('Aviso: pasta GitHub nao encontrada, HTML salvo so em Estoque.')

    # --- custos_agrotis.js: custo real (ultima compra) por MP e filial, lido pela ferramenta Custo de Producao ---
    # F2 = Rural/Eldorado, F5 = RNA/Ivinhema. "Ultima compra" = media ponderada das compras da data mais recente
    # (ignora permuta). Qualquer erro aqui so gera um aviso: nunca impede a geracao do compras.html.
    try:
        def _ultima_compra(rec):
            lista = rec.get('historico_precos') or rec.get('ultimas_compras') or []
            lista = [c for c in lista if (c.get('preco_unitario') or 0) > 0 and c.get('tipo') != 'permuta']
            if not lista:
                return None
            dia = max(str(c.get('data_iso') or '') for c in lista)
            do_dia = [c for c in lista if str(c.get('data_iso') or '') == dia]
            qtd = sum(float(c.get('quantidade') or 0) for c in do_dia)
            valor = sum(float(c.get('preco_unitario') or 0) * float(c.get('quantidade') or 0) for c in do_dia)
            preco = valor / qtd if qtd > 0 else float(do_dia[0].get('preco_unitario'))
            cad = rec.get('cadastro') or {}
            return {
                'preco': round(preco, 6), 'data': do_dia[0].get('data'),
                'tipo': '+'.join(sorted(set(str(c.get('tipo') or '') for c in do_dia))),
                'fornecedor': ' / '.join(sorted(set(str(c.get('fornecedor') or '') for c in do_dia))),
                'qtd': qtd, 'n': len(do_dia),
                'unidade': cad.get('unidade'), 'grupo': cad.get('grupo'), 'produto': cad.get('produto'),
            }

        def _por_filial(dados):
            out = {}
            for cod, rec in dados.items():
                u = _ultima_compra(rec)
                if u:
                    out[str(int(cod)) if str(cod).isdigit() else str(cod)] = u
            return out

        custos = {
            'gerado_em': datetime.datetime.now().strftime('%d/%m/%Y %H:%M'),
            'fonte': 'Agrotis (ultima compra, sem permuta)',
            'F2': _por_filial(json.loads(data_f2_str)),
            'F5': _por_filial(data_f5),
        }
        destino_custos = DROPBOX_GITHUB if os.path.isdir(DROPBOX_GITHUB) else ESTOQUE
        with open(os.path.join(destino_custos, 'custos_agrotis.js'), 'w', encoding='utf-8') as f:
            f.write('window.CUSTOS_AGROTIS = ' + json.dumps(custos, ensure_ascii=False, default=str) + ';\n')
        print(f'custos_agrotis.js gravado em {destino_custos} (F2: {len(custos["F2"])} itens, F5: {len(custos["F5"])} itens)')
    except Exception as e:
        print(f'Aviso: custos_agrotis.js nao foi gerado ({e}). O compras.html foi gerado normalmente.')

    xlsx_dir = os.path.join(DROPBOX_CLAUDE, 'Compras', 'Arquivos')
    if not os.path.isdir(xlsx_dir):
        xlsx_dir = ESTOQUE
        print('Aviso: pasta Dropbox/Compras/Arquivos nao encontrada, salvando xlsx em Estoque.')
    else:
        print(f'Salvando xlsx em: {xlsx_dir}')

    def chunk_xlsx(json_path, sheet_name, out_name):
        out_path = os.path.join(xlsx_dir, out_name)
        subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, 'build_chunk_xlsx.py'), json_path, sheet_name, out_path],
            check=True, env=env, cwd=SCRATCH,
        )
        return out_path

    f2_xlsx = chunk_xlsx(JSON_F2, 'DATA_F2', f'compras_f2_para_colar_{stamp}.xlsx')
    f5_xlsx = chunk_xlsx(JSON_F5, 'DATA_F5', f'compras_f5_para_colar_{stamp}.xlsx')
    futuras_xlsx = chunk_xlsx(futuras_path, 'DATA_FUTURAS', f'compras_futuras_para_colar_{stamp}.xlsx')

    print('ARQUIVOS FINAIS:')
    print(html_out)
    print(f2_xlsx)
    print(f5_xlsx)
    print(futuras_xlsx)

finally:
    print('Limpando pasta scratch...')
    for p in (GDB_LOCAL, ENGINE_LOCAL, FBLOCK_LOCAL):
        try:
            if os.path.isdir(p):
                shutil.rmtree(p, ignore_errors=True)
            elif os.path.exists(p):
                os.remove(p)
        except Exception as e:
            print(f'Aviso: falha ao limpar {p}: {e}')
    try:
        os.rmdir(SCRATCH)
    except Exception:
        pass
