"""T-16.1 : calcul des statistiques de la campagne (US-16)."""

import pytest

from app.admin.domain.statistics import CampaignStatistics


def test_ca01_counts_and_progress():
    statistics = CampaignStatistics.compute(total=7, updated=1)

    assert (statistics.total, statistics.updated, statistics.not_updated, statistics.progress) == (7, 1, 6, 14)


@pytest.mark.parametrize(
    ("total", "updated", "progress"),
    [
        (7, 1, 14),  # 14,28 %
        (7, 4, 57),  # 57,14 %
        (7, 6, 86),  # 85,71 %
        (8, 1, 13),  # 12,5 % : arrondi au plus proche, moitié vers le haut
        (200, 1, 1),  # 0,5 %
        (201, 1, 0),  # 0,497 %
        (3, 3, 100),
    ],
)
def test_progress_is_rounded_to_the_nearest_integer(total, updated, progress):
    assert CampaignStatistics.compute(total=total, updated=updated).progress == progress


def test_ca04_campaign_not_started():
    statistics = CampaignStatistics.compute(total=7, updated=0)

    assert (statistics.updated, statistics.not_updated, statistics.progress) == (0, 7, 0)


def test_no_employee_does_not_divide_by_zero():
    statistics = CampaignStatistics.compute(total=0, updated=0)

    assert (statistics.total, statistics.updated, statistics.not_updated, statistics.progress) == (0, 0, 0, 0)


def test_updated_cannot_exceed_total():
    with pytest.raises(ValueError):
        CampaignStatistics.compute(total=2, updated=3)
