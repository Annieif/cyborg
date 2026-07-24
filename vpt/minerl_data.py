"""
MineRL Data Tools — Dataset downloader, inspector, and converter.

MineRL provides human demonstration datasets for training and evaluation.
This module provides tools for:
  - Downloading MineRL datasets
  - Inspecting dataset contents
  - Converting MineRL data to formats usable by the VPT training pipeline

Reference:
  - https://minerl.readthedocs.io/en/latest/tutorials/data_sampling.html
  - https://github.com/openai/Video-Pre-Training (DataLoader)
"""

import os
import sys
import json
import argparse
import logging
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("minerl-data")

# ============================================================
# MineRL Dataset Information
# ============================================================

# MineRL datasets available for download
MINERL_DATASETS = {
    "MineRLObtainDiamond-v0": {
        "description": "ObtainDiamond task — human demonstrations",
        "size": "~8GB",
        "trajectories": "~60 hours",
    },
    "MineRLTreechop-v0": {
        "description": "Treechop task — human demonstrations",
        "size": "~1GB",
        "trajectories": "~5 hours",
    },
    "MineRLNavigate-v0": {
        "description": "Navigate task — human demonstrations",
        "size": "~2GB",
        "trajectories": "~10 hours",
    },
    "MineRLNavigateDense-v0": {
        "description": "NavigateDense task — human demonstrations",
        "size": "~2GB",
        "trajectories": "~10 hours",
    },
    "MineRLNavigateExtreme-v0": {
        "description": "NavigateExtreme task — human demonstrations",
        "size": "~2GB",
        "trajectories": "~10 hours",
    },
    "MineRLObtainDiamondVectorObf-v0": {
        "description": "ObtainDiamondVectorObf task — human demonstrations",
        "size": "~8GB",
        "trajectories": "~60 hours",
    },
}

# BASALT demonstration datasets
BASALT_DATASETS = {
    "MineRLBasaltFindCave-v0": {
        "description": "FindCave task — human demonstrations",
        "size": "~4GB",
    },
    "MineRLBasaltMakeWaterfall-v0": {
        "description": "MakeWaterfall task — human demonstrations",
        "size": "~4GB",
    },
    "MineRLBasaltCreateVillageAnimalPen-v0": {
        "description": "CreateVillageAnimalPen task — human demonstrations",
        "size": "~4GB",
    },
    "MineRLBasaltBuildVillageHouse-v0": {
        "description": "BuildVillageHouse task — human demonstrations",
        "size": "~4GB",
    },
}


def download_dataset(env_name: str, data_dir: Optional[str] = None) -> str:
    """
    Download a MineRL dataset.

    :param env_name: MineRL environment name (e.g., 'MineRLObtainDiamond-v0')
    :param data_dir: Directory to save data (default: MINERL_DATA_ROOT env var or './minerl_data')
    :return: Path to downloaded data
    """
    try:
        import minerl
    except ImportError:
        logger.error("MineRL not installed. Install with: pip install minerl")
        raise

    if data_dir is None:
        data_dir = os.environ.get("MINERL_DATA_ROOT", os.path.join(os.getcwd(), "minerl_data"))

    os.makedirs(data_dir, exist_ok=True)

    logger.info(f"Downloading dataset: {env_name}")
    logger.info(f"Data directory: {data_dir}")

    try:
        data = minerl.data.make(env_name, data_dir=data_dir)
        logger.info(f"Dataset '{env_name}' ready at {data_dir}")
        return data_dir
    except Exception as e:
        logger.error(f"Failed to download dataset: {e}")
        logger.info("Make sure you have a valid Minecraft license.")
        raise


def inspect_dataset(env_name: str, data_dir: Optional[str] = None, max_trajectories: int = 5):
    """
    Inspect a MineRL dataset and print statistics.

    :param env_name: MineRL environment name
    :param data_dir: Data directory
    :param max_trajectories: Max number of trajectories to inspect
    """
    try:
        import minerl
    except ImportError:
        logger.error("MineRL not installed. Install with: pip install minerl")
        return

    if data_dir is None:
        data_dir = os.environ.get("MINERL_DATA_ROOT", os.path.join(os.getcwd(), "minerl_data"))

    logger.info(f"Inspecting dataset: {env_name}")

    try:
        data = minerl.data.make(env_name, data_dir=data_dir)
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        return

    # Get trajectory names
    trajectory_names = data.get_trajectory_names()
    logger.info(f"Total trajectories: {len(trajectory_names)}")

    # Collect statistics
    total_steps = 0
    action_counts: Dict[str, int] = defaultdict(int)
    reward_sum = 0.0
    trajectory_lengths = []

    for i, traj_name in enumerate(trajectory_names[:max_trajectories]):
        try:
            traj_data = data.load_data(traj_name, include_metadata=True)
        except Exception as e:
            logger.warning(f"Could not load trajectory {traj_name}: {e}")
            continue

        step_count = 0
        traj_reward = 0.0

        for obs, act, reward, _, _ in traj_data.batch_iter(
            batch_size=1, preload_buffer_size=64
        ):
            step_count += 1
            total_steps += 1
            traj_reward += reward

            # Count actions
            for action_name in act:
                if action_name == "camera":
                    continue
                if act[action_name].item() == 1:
                    action_counts[action_name] += 1

        trajectory_lengths.append(step_count)
        reward_sum += traj_reward

        logger.info(
            f"  Trajectory {i + 1}: {traj_name[:40]}... "
            f"({step_count} steps, {traj_reward:.1f} reward)"
        )

    # Print summary
    print("\n" + "=" * 50)
    print("  Dataset Statistics")
    print("=" * 50)
    print(f"  Environment:     {env_name}")
    print(f"  Trajectories:    {len(trajectory_names)}")
    print(f"  Inspected:       {min(max_trajectories, len(trajectory_names))}")
    if trajectory_lengths:
        print(f"  Avg steps/traj:  {np.mean(trajectory_lengths):.0f}")
        print(f"  Max steps/traj:  {max(trajectory_lengths)}")
        print(f"  Min steps/traj:  {min(trajectory_lengths)}")
    print(f"  Total steps:     {total_steps}")
    if action_counts:
        print("\n  Top Actions:")
        for action, count in sorted(action_counts.items(), key=lambda x: -x[1])[:10]:
            print(f"    {action:15s}: {count:6d}")
    print("=" * 50)


def list_datasets():
    """List all available MineRL datasets."""
    print("\n=== MineRL Standard Datasets ===")
    for name, info in MINERL_DATASETS.items():
        print(f"  {name}")
        print(f"    {info['description']}")
        print(f"    Size: {info['size']}, Trajectories: {info['trajectories']}")
        print()

    print("=== MineRL BASALT Datasets ===")
    for name, info in BASALT_DATASETS.items():
        print(f"  {name}")
        print(f"    {info['description']}")
        print(f"    Size: {info['size']}")
        print()


def main():
    parser = argparse.ArgumentParser(description="MineRL Data Tools")
    subparsers = parser.add_subparsers(dest="command", help="Command")

    # List command
    subparsers.add_parser("list", help="List available datasets")

    # Download command
    download_parser = subparsers.add_parser("download", help="Download a dataset")
    download_parser.add_argument("env", type=str, help="MineRL environment name")
    download_parser.add_argument("--data-dir", type=str, default=None, help="Data directory")

    # Inspect command
    inspect_parser = subparsers.add_parser("inspect", help="Inspect a dataset")
    inspect_parser.add_argument("env", type=str, help="MineRL environment name")
    inspect_parser.add_argument("--data-dir", type=str, default=None, help="Data directory")
    inspect_parser.add_argument("--max-trajs", type=int, default=5, help="Max trajectories to inspect")

    args = parser.parse_args()

    if args.command == "list":
        list_datasets()
    elif args.command == "download":
        download_dataset(args.env, args.data_dir)
    elif args.command == "inspect":
        inspect_dataset(args.env, args.data_dir, args.max_trajs)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()