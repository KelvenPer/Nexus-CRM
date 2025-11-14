"""Default asset catalog definitions for trade proofs."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal


ProofType = Literal["image", "video", "screenshot", "report", "analytics"]


@dataclass
class ProofRequirement:
    type: ProofType
    description: str
    is_required: bool = True


@dataclass
class ProofTemplate:
    name: str
    instructions: str
    required_fields: List[str] = field(default_factory=list)


@dataclass
class AssetCatalog:
    id: str
    name: str
    category: Literal["digital", "physical", "print", "promotional"]
    description: str
    expected_metrics: List[str]
    proof_requirements: List[ProofRequirement]
    default_duration: int
    default_cost: float
    available_channels: List[str]
    proof_templates: List[ProofTemplate] = field(default_factory=list)


DEFAULT_ASSETS_CATALOG: List[AssetCatalog] = [
    AssetCatalog(
        id="banner_ecommerce",
        name="Banner no E-commerce",
        category="digital",
        description="Banner na homepage ou categoria específica",
        expected_metrics=["impressions", "clicks", "conversions"],
        proof_requirements=[
            ProofRequirement(type="screenshot", description="Print do banner no site"),
            ProofRequirement(type="analytics", description="Relatório de cliques e impressões"),
        ],
        default_duration=7,
        default_cost=5000,
        available_channels=["ecommerce"],
        proof_templates=[
            ProofTemplate(
                name="Template analytics",
                instructions="Enviar relatório de impressions/clicks exportado do GA.",
                required_fields=["impressions", "clicks"],
            )
        ],
    ),
    AssetCatalog(
        id="featured_app",
        name="Destaque no App",
        category="digital",
        description="Posição destacada no aplicativo móvel",
        expected_metrics=["app_views", "tap_through_rate", "conversions"],
        proof_requirements=[
            ProofRequirement(type="screenshot", description="Print do app com o destaque"),
            ProofRequirement(type="analytics", description="Relatório de engajamento no app"),
        ],
        default_duration=7,
        default_cost=8000,
        available_channels=["app"],
        proof_templates=[
            ProofTemplate(
                name="Relatório Firebase",
                instructions="Exportar screen views e taps em CSV.",
                required_fields=["screen_views", "tap_through_rate"],
            )
        ],
    ),
    AssetCatalog(
        id="tabloid_space",
        name="Espaço no Tabloide",
        category="print",
        description="Oferta destacada no tabloide impresso ou digital",
        expected_metrics=["circulation", "redemptions"],
        proof_requirements=[
            ProofRequirement(type="image", description="Foto do tabloide impresso"),
            ProofRequirement(type="report", description="Relatório de circulação"),
        ],
        default_duration=14,
        default_cost=15000,
        available_channels=["print", "digital_tabloid"],
        proof_templates=[
            ProofTemplate(
                name="Modelo Tabloide",
                instructions="Envie foto do tabloide aberto e PDF da edição.",
                required_fields=["edition_number", "distribution"],
            )
        ],
    ),
    AssetCatalog(
        id="gondola_endcap",
        name="Fim de Gôndola",
        category="physical",
        description="Posição privilegiada no fim de gôndola",
        expected_metrics=["sales_lift", "foot_traffic"],
        proof_requirements=[
            ProofRequirement(type="image", description="Foto do fim de gôndola montado"),
            ProofRequirement(type="video", description="Vídeo mostrando a localização", is_required=False),
        ],
        default_duration=30,
        default_cost=20000,
        available_channels=["physical_store"],
        proof_templates=[
            ProofTemplate(
                name="Checklist de loja",
                instructions="Checklist com timestamp, loja e SKU em destaque.",
                required_fields=["store", "sku", "photo_url"],
            )
        ],
    ),
    AssetCatalog(
        id="seasonal_campaign",
        name="Campanha Sazonal",
        category="promotional",
        description="Campanha especial para datas comemorativas",
        expected_metrics=["sales_volume", "new_customers"],
        proof_requirements=[
            ProofRequirement(type="image", description="Fotos da campanha em execução"),
            ProofRequirement(type="report", description="Relatório de resultados da campanha"),
        ],
        default_duration=45,
        default_cost=30000,
        available_channels=["all"],
        proof_templates=[
            ProofTemplate(
                name="Relatório executivo",
                instructions="Modelo com metas, resultados e learning.",
                required_fields=["sales_volume", "roi"],
            )
        ],
    ),
]
