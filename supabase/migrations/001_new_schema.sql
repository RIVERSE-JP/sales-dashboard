-- ============================================================
-- RVJP Sales Dashboard: New Schema Migration
-- ============================================================

-- 1. Dimension Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS platforms (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name_jp     TEXT NOT NULL,
  name_kr     TEXT,
  name_en     TEXT,
  color       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genres (
  id       SERIAL PRIMARY KEY,
  code     TEXT NOT NULL UNIQUE,
  name_jp  TEXT NOT NULL,
  name_kr  TEXT
);

CREATE TABLE IF NOT EXISTS production_companies (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS labels (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE
);

-- 2. Master Content Table
-- ============================================================

CREATE TABLE IF NOT EXISTS titles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_jp              TEXT NOT NULL,
  title_kr              TEXT,
  channel_title_jp      TEXT,
  series_name           TEXT,
  content_format        TEXT NOT NULL DEFAULT 'WEBTOON'
                        CHECK (content_format IN ('WEBTOON','PAGETOON','NOVEL')),
  content_type          TEXT CHECK (content_type IN ('WT','EP','EB','UNKNOWN')),
  management_type       TEXT,
  illustrator           TEXT,
  illustrator_yomi      TEXT,
  screenwriter          TEXT,
  screenwriter_yomi     TEXT,
  original_author       TEXT,
  original_author_yomi  TEXT,
  production_company_id INTEGER REFERENCES production_companies(id),
  distribution_company  TEXT,
  genre_id              INTEGER REFERENCES genres(id),
  label_id              INTEGER REFERENCES labels(id),
  serial_status         TEXT CHECK (serial_status IN ('連載中','完結','休載中','未連載')),
  serial_day_of_week    TEXT,
  latest_episode_count  INTEGER,
  contract_start_date   DATE,
  contract_end_date     DATE,
  service_launch_date   DATE,
  completion_date       DATE,
  return_schedule_date  DATE,
  distribution_scope    TEXT,
  exclusive_conv_date   DATE,
  nonexclusive_conv_date DATE,
  always_free_chapters  INTEGER DEFAULT 0,
  fixed_paid_chapters   INTEGER DEFAULT 0,
  rental_price_incl     NUMERIC(10,0),
  purchase_price_excl   NUMERIC(10,0),
  purchase_price_incl   NUMERIC(10,0),
  copyright_text        TEXT,
  synopsis              TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sheet_category        TEXT CHECK (sheet_category IN (
    'active_tateyomi','active_hanmen','prep_tateyomi','prep_hanmen'
  )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_titles_title_jp ON titles (title_jp);
CREATE INDEX IF NOT EXISTS idx_titles_title_kr ON titles (title_kr);
CREATE INDEX IF NOT EXISTS idx_titles_format ON titles (content_format);
CREATE INDEX IF NOT EXISTS idx_titles_genre ON titles (genre_id);
CREATE INDEX IF NOT EXISTS idx_titles_status ON titles (serial_status);
CREATE INDEX IF NOT EXISTS idx_titles_active ON titles (is_active);

-- 3. Title-Platform Junction
-- ============================================================

CREATE TABLE IF NOT EXISTS title_platform_availability (
  id             SERIAL PRIMARY KEY,
  title_id       UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  platform_id    INTEGER NOT NULL REFERENCES platforms(id),
  launch_date    DATE,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (title_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_tpa_title ON title_platform_availability (title_id);
CREATE INDEX IF NOT EXISTS idx_tpa_platform ON title_platform_availability (platform_id);

-- 4. Daily Sales Fact Table (NEW - replaces old daily_sales)
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_sales_v2 (
  id              BIGSERIAL PRIMARY KEY,
  title_id        UUID REFERENCES titles(id),
  title_jp        TEXT NOT NULL,
  title_kr        TEXT,
  channel_title_jp TEXT,
  platform_id     INTEGER REFERENCES platforms(id),
  channel         TEXT NOT NULL,
  sale_date       DATE NOT NULL,
  sales_amount    BIGINT NOT NULL DEFAULT 0,
  data_source     TEXT NOT NULL DEFAULT 'weekly_report'
                  CHECK (data_source IN ('weekly_report','sokuhochi','manual')),
  is_preliminary  BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (title_jp, channel, sale_date, data_source)
);

CREATE INDEX IF NOT EXISTS idx_dsv2_date ON daily_sales_v2 (sale_date);
CREATE INDEX IF NOT EXISTS idx_dsv2_channel ON daily_sales_v2 (channel);
CREATE INDEX IF NOT EXISTS idx_dsv2_title_jp ON daily_sales_v2 (title_jp);
CREATE INDEX IF NOT EXISTS idx_dsv2_title_id ON daily_sales_v2 (title_id);
CREATE INDEX IF NOT EXISTS idx_dsv2_platform ON daily_sales_v2 (platform_id);
CREATE INDEX IF NOT EXISTS idx_dsv2_date_channel ON daily_sales_v2 (sale_date, channel);
CREATE INDEX IF NOT EXISTS idx_dsv2_title_date ON daily_sales_v2 (title_jp, sale_date);

-- 5. Initial Sales Table
-- ============================================================

CREATE TABLE IF NOT EXISTS initial_sales (
  id                SERIAL PRIMARY KEY,
  title_id          UUID REFERENCES titles(id),
  title_kr          TEXT NOT NULL,
  platform_id       INTEGER REFERENCES platforms(id),
  platform_code     TEXT NOT NULL,
  genre_kr          TEXT,
  pf_genre          TEXT,
  launch_type       TEXT NOT NULL DEFAULT '비독점',
  launch_date       DATE NOT NULL,
  launch_episodes   INTEGER NOT NULL DEFAULT 0,
  d1 BIGINT DEFAULT 0, d2 BIGINT DEFAULT 0, d3 BIGINT DEFAULT 0,
  d4 BIGINT DEFAULT 0, d5 BIGINT DEFAULT 0, d6 BIGINT DEFAULT 0,
  d7 BIGINT DEFAULT 0, d8 BIGINT DEFAULT 0,
  w1 BIGINT DEFAULT 0, w2 BIGINT DEFAULT 0, w3 BIGINT DEFAULT 0,
  w4 BIGINT DEFAULT 0, w5 BIGINT DEFAULT 0, w6 BIGINT DEFAULT 0,
  w7 BIGINT DEFAULT 0, w8 BIGINT DEFAULT 0, w9 BIGINT DEFAULT 0,
  w10 BIGINT DEFAULT 0, w11 BIGINT DEFAULT 0, w12 BIGINT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (title_kr, platform_code, launch_date)
);

CREATE INDEX IF NOT EXISTS idx_is_platform ON initial_sales (platform_code);
CREATE INDEX IF NOT EXISTS idx_is_launch_date ON initial_sales (launch_date);
CREATE INDEX IF NOT EXISTS idx_is_title ON initial_sales (title_kr);

-- 6. Upload Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS upload_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_type   TEXT NOT NULL
                CHECK (upload_type IN ('weekly_report','sokuhochi','initial_sales','content_registry','manual')),
  source_file   TEXT,
  row_count     INTEGER NOT NULL DEFAULT 0,
  date_range_start DATE,
  date_range_end   DATE,
  platforms     TEXT[],
  status        TEXT NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing','completed','failed','superseded')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Seed Platform Data
-- ============================================================

INSERT INTO platforms (code, name_jp, name_kr, name_en, color, sort_order)
VALUES
  ('piccoma',      'ピッコマ',         '픽코마',      'Piccoma',       '#6B3FA0', 1),
  ('cmoa',         'コミックシーモア',   '코믹시모아',    'Comic Cmoa',    '#E8432E', 2),
  ('mechacomic',   'めちゃコミック',     '메챠코믹',     'MechaComic',    '#FF6B35', 3),
  ('line_manga',   'LINEマンガ',       '라인망가',     'LINE Manga',    '#06C755', 4),
  ('ebookjapan',   'ebookjapan',       'EBJ',         'ebookjapan',    '#FF4081', 5),
  ('renta',        'Renta!',           '렌타',        'Renta',         '#FF5252', 6),
  ('dmm',          'DMM',              'DMM',         'DMM',           '#1A237E', 7),
  ('dmm_fanza',    'DMM(FANZA)',        'DMM(판자)',    'DMM FANZA',     '#303F9F', 8),
  ('manga_oukoku', 'まんが王国',        '만가오우코쿠',  'Manga Oukoku',  '#FFA000', 9),
  ('u_next',       'U-NEXT',           'U-NEXT',      'U-NEXT',        '#121212', 10),
  ('booklive',     'BookLive',         '북라이브',     'BookLive',      '#FF6F00', 11),
  ('comico',       'comico',           '코미코',      'comico',        '#FF9800', 12),
  ('lezhin',       'レジン',           '레진',        'Lezhin',        '#FFEB3B', 13),
  ('belltoon',     'ベルトーン',        '벨툰',       'Belltoon',      '#4CAF50', 14),
  ('mangabang',    'MangaBang',        '만가방',      'MangaBang',     '#2196F3', 15),
  ('bukkomu',      'ブッコミ',         '붓코미',      'Bukkomi',       '#9C27B0', 16),
  ('mediado',      'Mediado',          '메디아도',     'Mediado',       '#607D8B', 17),
  ('mbj',          'MBJ',              'MBJ',         'MBJ',           '#795548', 18),
  ('animate',      'アニメイトBS',      '아니메이트',   'Animate BS',    '#F44336', 19),
  ('kinoppy',      'kinoppy',          '키노피',      'kinoppy',       '#00BCD4', 20),
  ('reader_store', 'Reader Store',     '리더스토어',   'Reader Store',  '#3F51B5', 21),
  ('au_bookpass',  'auブックパス',      'AU북패스',    'au Bookpass',   '#FF5722', 22),
  ('fod',          'FOD',              'FOD',         'FOD',           '#E91E63', 23)
ON CONFLICT (code) DO NOTHING;

-- 8. Seed Genre Data
-- ============================================================

INSERT INTO genres (code, name_jp, name_kr)
VALUES
  ('adult',          '成人/青年',           '성인/청년'),
  ('fantasy_sf',     'ファンタジーSF',       '판타지SF'),
  ('womens_manga',   '女性マンガ',           '여성만화'),
  ('bl',             'BL',                 'BL'),
  ('fantasy',        'ファンタジー',         '판타지'),
  ('romance',        '恋愛',               '연애'),
  ('action',         'アクション',           '액션'),
  ('drama',          'ドラマ',              '드라마'),
  ('shonen',         '少年マンガ',           '소년만화'),
  ('shojo',          '少女マンガ',           '소녀만화'),
  ('tl',             'TL',                 'TL'),
  ('mystery_horror', 'ミステリー・ホラー',    '미스터리/호러'),
  ('sports',         'スポーツ',            '스포츠'),
  ('martial_arts',   '武侠',               '무협'),
  ('modern_romance', '現代ロマンス',         '현대로맨스'),
  ('isekai',         '異世界',              '이세계')
ON CONFLICT (code) DO NOTHING;

-- 9. Upsert Function for Daily Sales
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_daily_sales(
  p_rows JSONB,
  p_source TEXT DEFAULT 'weekly_report',
  p_is_preliminary BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_inserted INT := 0;
  v_updated INT := 0;
BEGIN
  WITH upserted AS (
    INSERT INTO daily_sales_v2 (title_jp, title_kr, channel_title_jp, channel, sale_date, sales_amount, data_source, is_preliminary)
    SELECT
      x->>'title_jp',
      x->>'title_kr',
      x->>'channel_title_jp',
      x->>'channel',
      (x->>'sale_date')::DATE,
      (x->>'sales_amount')::BIGINT,
      p_source,
      p_is_preliminary
    FROM jsonb_array_elements(p_rows) AS x
    ON CONFLICT (title_jp, channel, sale_date, data_source)
    DO UPDATE SET
      sales_amount = EXCLUDED.sales_amount,
      title_kr = COALESCE(EXCLUDED.title_kr, daily_sales_v2.title_kr),
      uploaded_at = now()
    RETURNING (xmax = 0) AS is_insert
  )
  SELECT
    COUNT(*) FILTER (WHERE is_insert),
    COUNT(*) FILTER (WHERE NOT is_insert)
  INTO v_inserted, v_updated
  FROM upserted;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
END;
$$ LANGUAGE plpgsql;

-- 10. RLS Policies
-- ============================================================

ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_platform_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE initial_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

-- Read access for anon (dashboard uses anon key)
CREATE POLICY "anon_read" ON platforms FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON genres FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON production_companies FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON labels FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON titles FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON title_platform_availability FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON daily_sales_v2 FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON initial_sales FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON upload_logs FOR SELECT TO anon USING (true);

-- Write access for anon (upload flow)
CREATE POLICY "anon_insert" ON daily_sales_v2 FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON daily_sales_v2 FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert" ON initial_sales FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON initial_sales FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert" ON titles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON titles FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert" ON title_platform_availability FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON production_companies FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON labels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert" ON upload_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON upload_logs FOR UPDATE TO anon USING (true);
